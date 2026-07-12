import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  maintenanceRepository,
  type MaintenanceWithVehicle,
} from "@/lib/repositories/maintenance.repository";
import {
  NotFoundError,
  BusinessRuleError,
  ConflictError,
} from "@/lib/http/errors";
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_LABELS,
  type MaintenanceStatusValue,
} from "@/lib/domain/maintenance";
import { VEHICLE_STATUS } from "@/lib/domain/vehicle";
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  ListMaintenanceQuery,
} from "@/lib/validation/maintenance";

/**
 * Maintenance business logic (problem.md §4.6, §5 R9/R10, §7.4, §18-D). Opening a record
 * sends the vehicle In Shop and closing restores it - both TRANSACTIONAL with a row lock,
 * so the maintenance record and vehicle status always agree. (guidelines.md §8)
 */

const num = (d: Prisma.Decimal | null): number | null => (d == null ? null : Number(d));

function toDTO(m: MaintenanceWithVehicle) {
  const status = m.status as MaintenanceStatusValue;
  return {
    id: m.id,
    vehicle: { id: m.vehicle.id, registrationNumber: m.vehicle.registrationNumber, nameModel: m.vehicle.nameModel },
    type: m.type,
    description: m.description,
    cost: Number(m.cost),
    status,
    statusLabel: MAINTENANCE_STATUS_LABELS[status],
    odometerAtService: num(m.odometerAtService),
    openedAt: m.openedAt.toISOString(),
    closedAt: m.closedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}
export type MaintenanceDTO = ReturnType<typeof toDTO>;

const include = {
  vehicle: { select: { id: true, registrationNumber: true, nameModel: true, status: true } },
} satisfies Prisma.MaintenanceLogInclude;

export const maintenanceService = {
  async list(query: ListMaintenanceQuery) {
    const where: Prisma.MaintenanceLogWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.search) where.type = { contains: query.search, mode: "insensitive" };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      maintenanceRepository.findMany({ where, orderBy: { [query.sort]: query.order }, skip, take: query.limit }),
      maintenanceRepository.count(where),
    ]);
    return {
      items: items.map(toDTO),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  },

  async getById(id: number): Promise<MaintenanceDTO> {
    const m = await maintenanceRepository.findById(id);
    if (!m) throw NotFoundError("Maintenance record not found");
    return toDTO(m);
  },

  /**
   * Open a maintenance record (R9). Transactional: locks the vehicle row, re-checks that
   * it is Available (blocks On Trip per §18-D, In Shop, and Retired), creates the Open
   * record, and sets the vehicle In Shop atomically. The partial-unique index is the
   * DB-level backstop against a second open record.
   */
  async open(input: CreateMaintenanceInput): Promise<MaintenanceDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${input.vehicleId} FOR UPDATE`;
        const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
        if (!vehicle) throw BusinessRuleError("Selected vehicle does not exist", { vehicleId: ["Not found"] });

        if (vehicle.status === VEHICLE_STATUS.RETIRED) {
          throw BusinessRuleError("Cannot open maintenance for a retired vehicle");
        }
        if (vehicle.status === VEHICLE_STATUS.ON_TRIP) {
          throw BusinessRuleError(
            "This vehicle is On Trip - complete or cancel its trip before maintenance (§18-D)",
          );
        }
        if (vehicle.status === VEHICLE_STATUS.IN_SHOP) {
          throw BusinessRuleError("This vehicle already has an open maintenance record");
        }

        const record = await tx.maintenanceLog.create({
          data: {
            vehicle: { connect: { id: input.vehicleId } },
            type: input.type,
            description: input.description ?? null,
            cost: input.cost,
            odometerAtService: input.odometerAtService ?? null,
          },
          include,
        });
        await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: VEHICLE_STATUS.IN_SHOP } });
        return toDTO(record as MaintenanceWithVehicle);
      });
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        throw ConflictError("This vehicle already has an open maintenance record");
      }
      throw err;
    }
  },

  /**
   * Close a maintenance record (R10). Transactional: marks it Closed and restores the
   * vehicle to Available - UNLESS the vehicle has since been Retired, in which case it
   * stays Retired.
   */
  async close(id: number): Promise<MaintenanceDTO> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM maintenance_logs WHERE id = ${id} FOR UPDATE`;
      const record = await tx.maintenanceLog.findUnique({ where: { id } });
      if (!record) throw NotFoundError("Maintenance record not found");
      if (record.status !== MAINTENANCE_STATUS.OPEN) {
        throw BusinessRuleError("This maintenance record is already closed");
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: record.vehicleId } });
      // R10: restore to Available unless the vehicle is Retired.
      if (vehicle && vehicle.status !== VEHICLE_STATUS.RETIRED) {
        await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: VEHICLE_STATUS.AVAILABLE } });
      }
      const updated = await tx.maintenanceLog.update({
        where: { id },
        data: { status: MAINTENANCE_STATUS.CLOSED, closedAt: new Date() },
        include,
      });
      return toDTO(updated as MaintenanceWithVehicle);
    });
  },

  /** Edit descriptive/cost fields (e.g. correcting the cost). Does not change status. */
  async update(id: number, input: UpdateMaintenanceInput): Promise<MaintenanceDTO> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw NotFoundError("Maintenance record not found");

    const data: Prisma.MaintenanceLogUpdateInput = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.description !== undefined) data.description = input.description ?? null;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.odometerAtService !== undefined) data.odometerAtService = input.odometerAtService ?? null;

    const updated = await maintenanceRepository.update(id, data);
    return toDTO(updated);
  },
};
