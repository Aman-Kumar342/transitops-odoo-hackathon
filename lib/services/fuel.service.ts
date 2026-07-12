import type { Prisma } from "@prisma/client";
import { fuelRepository, type FuelLogWithVehicle } from "@/lib/repositories/fuel.repository";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { NotFoundError, BusinessRuleError } from "@/lib/http/errors";
import { parseIsoDate } from "@/lib/domain/date";
import type { CreateFuelLogInput, UpdateFuelLogInput, ListFuelLogsQuery } from "@/lib/validation/fuel";

/**
 * Fuel-log business logic (problem.md §4.7, §5 R14). CRUD; feeds operational cost and
 * fuel efficiency. (guidelines.md §8)
 */

const num = (d: Prisma.Decimal | null): number | null => (d == null ? null : Number(d));

function toDTO(f: FuelLogWithVehicle) {
  return {
    id: f.id,
    vehicle: { id: f.vehicle.id, registrationNumber: f.vehicle.registrationNumber, nameModel: f.vehicle.nameModel },
    tripId: f.tripId,
    liters: Number(f.liters),
    cost: Number(f.cost),
    date: f.date.toISOString().slice(0, 10),
    odometer: num(f.odometer),
    notes: f.notes,
    createdAt: f.createdAt.toISOString(),
  };
}
export type FuelLogDTO = ReturnType<typeof toDTO>;

export const fuelService = {
  async list(query: ListFuelLogsQuery) {
    const where: Prisma.FuelLogWhereInput = {};
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.tripId) where.tripId = query.tripId;
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      fuelRepository.findMany({ where, orderBy: { [query.sort]: query.order }, skip, take: query.limit }),
      fuelRepository.count(where),
    ]);
    return {
      items: items.map(toDTO),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  },

  async getById(id: number): Promise<FuelLogDTO> {
    const f = await fuelRepository.findById(id);
    if (!f) throw NotFoundError("Fuel log not found");
    return toDTO(f);
  },

  async create(input: CreateFuelLogInput): Promise<FuelLogDTO> {
    const vehicle = await vehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw BusinessRuleError("Selected vehicle does not exist", { vehicleId: ["Not found"] });
    const created = await fuelRepository.create({
      vehicle: { connect: { id: input.vehicleId } },
      trip: input.tripId ? { connect: { id: input.tripId } } : undefined,
      liters: input.liters,
      cost: input.cost,
      date: parseIsoDate(input.date),
      odometer: input.odometer ?? null,
      notes: input.notes ?? null,
    });
    return toDTO(created);
  },

  async update(id: number, input: UpdateFuelLogInput): Promise<FuelLogDTO> {
    const existing = await fuelRepository.findById(id);
    if (!existing) throw NotFoundError("Fuel log not found");
    const data: Prisma.FuelLogUpdateInput = {};
    if (input.liters !== undefined) data.liters = input.liters;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.date !== undefined) data.date = parseIsoDate(input.date);
    if (input.odometer !== undefined) data.odometer = input.odometer ?? null;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    if (input.tripId !== undefined) data.trip = input.tripId ? { connect: { id: input.tripId } } : { disconnect: true };
    const updated = await fuelRepository.update(id, data);
    return toDTO(updated);
  },

  async remove(id: number): Promise<void> {
    const existing = await fuelRepository.findById(id);
    if (!existing) throw NotFoundError("Fuel log not found");
    await fuelRepository.delete(id);
  },
};
