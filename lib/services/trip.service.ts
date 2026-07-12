import type { Prisma, Trip } from "@prisma/client";
import { prisma } from "@/lib/db";
import { tripRepository, type TripWithParties } from "@/lib/repositories/trip.repository";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { driverRepository } from "@/lib/repositories/driver.repository";
import {
  NotFoundError,
  BusinessRuleError,
  ConflictError,
} from "@/lib/http/errors";
import { TRIP_STATUS, TRIP_STATUS_LABELS, type TripStatusValue } from "@/lib/domain/trip";
import { VEHICLE_STATUS } from "@/lib/domain/vehicle";
import { DRIVER_STATUS, isDriverEligible, type DriverStatusValue } from "@/lib/domain/driver";
import type {
  CreateTripInput,
  UpdateTripInput,
  CompleteTripInput,
  ListTripsQuery,
} from "@/lib/validation/trip";

/**
 * Trip business logic (problem.md §4.5, §5 R2-R8/R11, §7.3). The dispatch/complete/
 * cancel operations are TRANSACTIONAL: the trip and both resources change atomically,
 * with row locks + a partial-unique race guard, so no partial/impossible state can
 * occur (e.g. a Dispatched trip with an Available driver). (guidelines.md §8, §15)
 */

const num = (d: Prisma.Decimal | null): number | null => (d == null ? null : Number(d));

function toDTO(t: TripWithParties) {
  const status = t.status as TripStatusValue;
  return {
    id: t.id,
    source: t.source,
    destination: t.destination,
    vehicle: {
      id: t.vehicle.id,
      registrationNumber: t.vehicle.registrationNumber,
      nameModel: t.vehicle.nameModel,
    },
    driver: { id: t.driver.id, name: t.driver.name },
    cargoWeight: Number(t.cargoWeight),
    plannedDistance: Number(t.plannedDistance),
    status,
    statusLabel: TRIP_STATUS_LABELS[status],
    startOdometer: num(t.startOdometer),
    finalOdometer: num(t.finalOdometer),
    fuelConsumed: num(t.fuelConsumed),
    revenue: num(t.revenue),
    dispatchedAt: t.dispatchedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
export type TripDTO = ReturnType<typeof toDTO>;

export const tripService = {
  async list(query: ListTripsQuery) {
    const where: Prisma.TripWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.driverId) where.driverId = query.driverId;
    if (query.search) {
      where.OR = [
        { source: { contains: query.search, mode: "insensitive" } },
        { destination: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      tripRepository.findMany({ where, orderBy: { [query.sort]: query.order }, skip, take: query.limit }),
      tripRepository.count(where),
    ]);
    return {
      items: items.map(toDTO),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async getById(id: number): Promise<TripDTO> {
    const trip = await tripRepository.findById(id);
    if (!trip) throw NotFoundError("Trip not found");
    return toDTO(trip);
  },

  /** Create a Draft trip. Validates existence + cargo<=capacity (R5). Full dispatch
   *  eligibility is re-checked at dispatch time (R13). */
  async create(input: CreateTripInput, userId?: number): Promise<TripDTO> {
    const vehicle = await vehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw BusinessRuleError("Selected vehicle does not exist", { vehicleId: ["Not found"] });
    if (vehicle.status === VEHICLE_STATUS.RETIRED) {
      throw BusinessRuleError("Cannot create a trip for a retired vehicle", { vehicleId: ["Retired"] });
    }
    const driver = await driverRepository.findById(input.driverId);
    if (!driver || driver.deletedAt) throw BusinessRuleError("Selected driver does not exist", { driverId: ["Not found"] });

    // R5: cargo must not exceed capacity.
    if (input.cargoWeight > Number(vehicle.maxLoadCapacity)) {
      throw BusinessRuleError(
        `Cargo weight exceeds the vehicle's capacity of ${Number(vehicle.maxLoadCapacity)} kg`,
        { cargoWeight: [`Must be at most ${Number(vehicle.maxLoadCapacity)}`] },
      );
    }

    const created = await tripRepository.create({
      source: input.source,
      destination: input.destination,
      vehicle: { connect: { id: input.vehicleId } },
      driver: { connect: { id: input.driverId } },
      cargoWeight: input.cargoWeight,
      plannedDistance: input.plannedDistance,
      createdBy: userId ? { connect: { id: userId } } : undefined,
    });
    return toDTO(created);
  },

  /** Edit a Draft trip only. */
  async update(id: number, input: UpdateTripInput): Promise<TripDTO> {
    const existing = await tripRepository.findById(id);
    if (!existing) throw NotFoundError("Trip not found");
    if (existing.status !== TRIP_STATUS.DRAFT) {
      throw BusinessRuleError("Only a draft trip can be edited");
    }

    const vehicleId = input.vehicleId ?? existing.vehicleId;
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw BusinessRuleError("Selected vehicle does not exist", { vehicleId: ["Not found"] });
    const cargo = input.cargoWeight ?? Number(existing.cargoWeight);
    if (cargo > Number(vehicle.maxLoadCapacity)) {
      throw BusinessRuleError(
        `Cargo weight exceeds the vehicle's capacity of ${Number(vehicle.maxLoadCapacity)} kg`,
        { cargoWeight: [`Must be at most ${Number(vehicle.maxLoadCapacity)}`] },
      );
    }

    const data: Prisma.TripUpdateInput = {};
    if (input.source !== undefined) data.source = input.source;
    if (input.destination !== undefined) data.destination = input.destination;
    if (input.vehicleId !== undefined) data.vehicle = { connect: { id: input.vehicleId } };
    if (input.driverId !== undefined) data.driver = { connect: { id: input.driverId } };
    if (input.cargoWeight !== undefined) data.cargoWeight = input.cargoWeight;
    if (input.plannedDistance !== undefined) data.plannedDistance = input.plannedDistance;

    const updated = await tripRepository.update(id, data);
    return toDTO(updated);
  },

  /**
   * Dispatch (R6). Transactional: locks the vehicle + driver rows, re-validates R2/R3/R5
   * at the moment of dispatch (R13), then flips trip->Dispatched and both resources->
   * On Trip atomically. The partial-unique index (R4) is the DB-level backstop against
   * concurrent double-dispatch.
   */
  async dispatch(id: number): Promise<TripDTO> {
    try {
      const dto = await prisma.$transaction(async (tx) => {
        // Serialize transitions on this trip + its resources.
        await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`;
        const trip = await tx.trip.findUnique({ where: { id } });
        if (!trip) throw NotFoundError("Trip not found");
        if (trip.status !== TRIP_STATUS.DRAFT) {
          throw BusinessRuleError("Only a draft trip can be dispatched");
        }

        await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${trip.vehicleId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM drivers WHERE id = ${trip.driverId} FOR UPDATE`;

        const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
        const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });
        if (!vehicle || !driver) throw NotFoundError("Vehicle or driver not found");

        // R2: vehicle must be Available (not On Trip / In Shop / Retired).
        if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
          throw BusinessRuleError("Vehicle is not available for dispatch");
        }
        // R3: driver must be eligible (Available, license valid, not suspended/deleted).
        if (!isDriverEligible({ status: driver.status as DriverStatusValue, licenseExpiryDate: driver.licenseExpiryDate, deletedAt: driver.deletedAt })) {
          throw BusinessRuleError("Driver is not eligible for dispatch");
        }
        // R5: cargo must not exceed capacity (capacity may have changed since draft).
        if (Number(trip.cargoWeight) > Number(vehicle.maxLoadCapacity)) {
          throw BusinessRuleError("Cargo weight exceeds the vehicle's capacity");
        }

        // R6 side effects (atomic).
        await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: VEHICLE_STATUS.ON_TRIP } });
        await tx.driver.update({ where: { id: driver.id }, data: { status: DRIVER_STATUS.ON_TRIP } });
        const updated = await tx.trip.update({
          where: { id },
          data: {
            status: TRIP_STATUS.DISPATCHED,
            startOdometer: vehicle.odometer,
            dispatchedAt: new Date(),
          },
          include: tripInclude,
        });
        return toDTO(updated as TripWithParties);
      });
      return dto;
    } catch (err) {
      throw mapRaceViolation(err);
    }
  },

  /**
   * Complete (R7). Transactional: validates monotonic odometer (R11), records odometer/
   * fuel/revenue on the trip, and returns both resources to Available atomically.
   */
  async complete(id: number, input: CompleteTripInput): Promise<TripDTO> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw NotFoundError("Trip not found");
      if (trip.status !== TRIP_STATUS.DISPATCHED) {
        throw BusinessRuleError("Only a dispatched trip can be completed");
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
      if (!vehicle) throw NotFoundError("Vehicle not found");

      // R11: final odometer must be >= the odometer at dispatch (and current).
      const start = Number(trip.startOdometer ?? vehicle.odometer);
      if (input.finalOdometer < start) {
        throw BusinessRuleError("Final odometer cannot be less than the start odometer", {
          finalOdometer: [`Must be at least ${start}`],
        });
      }

      // R7 side effects (atomic).
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: VEHICLE_STATUS.AVAILABLE, odometer: input.finalOdometer },
      });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: DRIVER_STATUS.AVAILABLE } });
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: TRIP_STATUS.COMPLETED,
          finalOdometer: input.finalOdometer,
          fuelConsumed: input.fuelConsumed,
          revenue: input.revenue ?? null,
          completedAt: new Date(),
        },
        include: tripInclude,
      });
      return toDTO(updated as TripWithParties);
    });
  },

  /**
   * Cancel (R8). A Draft cancels with no side effects; a Dispatched trip restores both
   * resources to Available. Completed/Cancelled trips cannot be cancelled.
   */
  async cancel(id: number): Promise<TripDTO> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw NotFoundError("Trip not found");
      if (trip.status !== TRIP_STATUS.DRAFT && trip.status !== TRIP_STATUS.DISPATCHED) {
        throw BusinessRuleError("This trip can no longer be cancelled");
      }

      if (trip.status === TRIP_STATUS.DISPATCHED) {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: VEHICLE_STATUS.AVAILABLE } });
        await tx.driver.update({ where: { id: trip.driverId }, data: { status: DRIVER_STATUS.AVAILABLE } });
      }
      const updated = await tx.trip.update({
        where: { id },
        data: { status: TRIP_STATUS.CANCELLED, cancelledAt: new Date() },
        include: tripInclude,
      });
      return toDTO(updated as TripWithParties);
    });
  },
};

const tripInclude = {
  vehicle: { select: { id: true, registrationNumber: true, nameModel: true, maxLoadCapacity: true, status: true, odometer: true } },
  driver: { select: { id: true, name: true, status: true } },
} satisfies Prisma.TripInclude;

/** Maps the partial-unique race violation (P2002) to a 409 (lost the dispatch race). */
function mapRaceViolation(err: unknown): unknown {
  if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
    return ConflictError("This vehicle or driver was just dispatched to another trip");
  }
  return err;
}
