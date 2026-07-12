import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Maintenance data access. DB operations only - no business logic. (guidelines.md §9)
 * The open/close transactions are orchestrated by the service.
 */
const withVehicle = {
  vehicle: { select: { id: true, registrationNumber: true, nameModel: true, status: true } },
} satisfies Prisma.MaintenanceLogInclude;

export const maintenanceRepository = {
  findMany(args: {
    where: Prisma.MaintenanceLogWhereInput;
    orderBy: Prisma.MaintenanceLogOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.maintenanceLog.findMany({ ...args, include: withVehicle });
  },

  count(where: Prisma.MaintenanceLogWhereInput) {
    return prisma.maintenanceLog.count({ where });
  },

  findById(id: number) {
    return prisma.maintenanceLog.findUnique({ where: { id }, include: withVehicle });
  },

  update(id: number, data: Prisma.MaintenanceLogUpdateInput) {
    return prisma.maintenanceLog.update({ where: { id }, data, include: withVehicle });
  },
  /** Sum of maintenance cost for a vehicle - the single source of truth for the
   *  maintenance component of operational cost (§18-E). */
  aggregateCostByVehicle(vehicleId: number) {
    return prisma.maintenanceLog.aggregate({ where: { vehicleId }, _sum: { cost: true } });
  },
  /** Maintenance cost grouped by vehicle (for fleet analytics, no N+1). */
  groupCostByVehicle() {
    return prisma.maintenanceLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } });
  },
};

export type MaintenanceWithVehicle = NonNullable<
  Awaited<ReturnType<typeof maintenanceRepository.findById>>
>;
