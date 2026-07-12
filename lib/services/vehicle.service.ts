import type { Prisma, Vehicle } from "@prisma/client";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import {
  ConflictError,
  NotFoundError,
  BusinessRuleError,
} from "@/lib/http/errors";
import {
  VEHICLE_STATUS,
  VEHICLE_STATUS_LABELS,
  normalizeRegistration,
  type VehicleStatusValue,
} from "@/lib/domain/vehicle";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  ListVehiclesQuery,
} from "@/lib/validation/vehicle";

/**
 * Vehicle business logic (problem.md §4.3, §5, §7.1). Single source of truth for the
 * vehicle rules; the DB enforces the same invariants as a backstop. (guidelines.md §8)
 */

export interface VehicleDTO {
  id: number;
  registrationNumber: string;
  nameModel: string;
  type: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: VehicleStatusValue;
  statusLabel: string;
  region: string | null;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const num = (d: Prisma.Decimal): number => Number(d);

function toDTO(v: Vehicle): VehicleDTO {
  const status = v.status as VehicleStatusValue;
  return {
    id: v.id,
    registrationNumber: v.registrationNumber,
    nameModel: v.nameModel,
    type: v.type,
    maxLoadCapacity: num(v.maxLoadCapacity),
    odometer: num(v.odometer),
    acquisitionCost: num(v.acquisitionCost),
    status,
    statusLabel: VEHICLE_STATUS_LABELS[status],
    region: v.region,
    retiredAt: v.retiredAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export const vehicleService = {
  async list(query: ListVehiclesQuery) {
    const where: Prisma.VehicleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.region) where.region = { equals: query.region, mode: "insensitive" };
    if (query.registrationNumber) {
      where.registrationNumber = normalizeRegistration(query.registrationNumber);
    }
    if (query.search) {
      const term = query.search;
      where.OR = [
        { registrationNumber: { contains: term, mode: "insensitive" } },
        { nameModel: { contains: term, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      vehicleRepository.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        skip,
        take: query.limit,
      }),
      vehicleRepository.count(where),
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

  async getById(id: number): Promise<VehicleDTO> {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw NotFoundError("Vehicle not found");
    return toDTO(vehicle);
  },

  /** Dispatch pool — only Available vehicles (R2). */
  async listAvailable(): Promise<VehicleDTO[]> {
    const items = await vehicleRepository.findMany({
      where: { status: VEHICLE_STATUS.AVAILABLE },
      orderBy: { registrationNumber: "asc" },
      skip: 0,
      take: 500,
    });
    return items.map(toDTO);
  },

  async create(input: CreateVehicleInput): Promise<VehicleDTO> {
    // Registration is already normalized by the schema transform; re-check uniqueness
    // (R1) here, and let the DB unique constraint be the final backstop.
    const existing = await vehicleRepository.findByRegistrationNumber(
      input.registrationNumber,
    );
    if (existing) {
      throw ConflictError("A vehicle with this registration number already exists", {
        registrationNumber: ["Already registered"],
      });
    }

    try {
      const created = await vehicleRepository.create({
        registrationNumber: input.registrationNumber,
        nameModel: input.nameModel,
        type: input.type,
        maxLoadCapacity: input.maxLoadCapacity,
        odometer: input.odometer,
        acquisitionCost: input.acquisitionCost,
        region: input.region ?? null,
        // status defaults to AVAILABLE
      });
      return toDTO(created);
    } catch (err) {
      throw mapUniqueViolation(err);
    }
  },

  async update(id: number, input: UpdateVehicleInput): Promise<VehicleDTO> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) throw NotFoundError("Vehicle not found");

    // A retired vehicle is terminal — no edits (§7.1).
    if (existing.status === VEHICLE_STATUS.RETIRED) {
      throw BusinessRuleError("A retired vehicle cannot be edited");
    }

    // R11: odometer is monotonic non-decreasing.
    if (
      input.odometer !== undefined &&
      input.odometer < Number(existing.odometer)
    ) {
      throw BusinessRuleError("Odometer cannot decrease", {
        odometer: [`Must be at least ${Number(existing.odometer)}`],
      });
    }

    // R1: if the registration number changes, enforce uniqueness.
    if (
      input.registrationNumber &&
      input.registrationNumber !== existing.registrationNumber
    ) {
      const clash = await vehicleRepository.findByRegistrationNumber(
        input.registrationNumber,
      );
      if (clash && clash.id !== id) {
        throw ConflictError("A vehicle with this registration number already exists", {
          registrationNumber: ["Already registered"],
        });
      }
    }

    const data: Prisma.VehicleUpdateInput = {};
    if (input.registrationNumber !== undefined) data.registrationNumber = input.registrationNumber;
    if (input.nameModel !== undefined) data.nameModel = input.nameModel;
    if (input.type !== undefined) data.type = input.type;
    if (input.maxLoadCapacity !== undefined) data.maxLoadCapacity = input.maxLoadCapacity;
    if (input.odometer !== undefined) data.odometer = input.odometer;
    if (input.acquisitionCost !== undefined) data.acquisitionCost = input.acquisitionCost;
    if (input.region !== undefined) data.region = input.region ?? null;

    try {
      const updated = await vehicleRepository.update(id, data);
      return toDTO(updated);
    } catch (err) {
      throw mapUniqueViolation(err);
    }
  },

  /** Soft delete = Retire (R15, §7.1). Cannot retire a vehicle that is On Trip. */
  async retire(id: number): Promise<VehicleDTO> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) throw NotFoundError("Vehicle not found");

    if (existing.status === VEHICLE_STATUS.RETIRED) {
      throw BusinessRuleError("Vehicle is already retired");
    }
    if (existing.status === VEHICLE_STATUS.ON_TRIP) {
      throw BusinessRuleError(
        "Cannot retire a vehicle that is On Trip — complete or cancel its trip first",
      );
    }

    const updated = await vehicleRepository.update(id, {
      status: VEHICLE_STATUS.RETIRED,
      retiredAt: new Date(),
    });
    return toDTO(updated);
  },
};

/** Maps a Prisma unique-constraint violation (P2002) to a 409. */
function mapUniqueViolation(err: unknown): unknown {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) {
    return ConflictError("A vehicle with this registration number already exists", {
      registrationNumber: ["Already registered"],
    });
  }
  return err;
}
