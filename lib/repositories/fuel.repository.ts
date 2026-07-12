import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Fuel-log data access. DB operations only. (guidelines.md §9) */
const withVehicle = {
  vehicle: { select: { id: true, registrationNumber: true, nameModel: true } },
} satisfies Prisma.FuelLogInclude;

export const fuelRepository = {
  findMany(args: {
    where: Prisma.FuelLogWhereInput;
    orderBy: Prisma.FuelLogOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.fuelLog.findMany({ ...args, include: withVehicle });
  },
  count(where: Prisma.FuelLogWhereInput) {
    return prisma.fuelLog.count({ where });
  },
  findById(id: number) {
    return prisma.fuelLog.findUnique({ where: { id }, include: withVehicle });
  },
  create(data: Prisma.FuelLogCreateInput) {
    return prisma.fuelLog.create({ data, include: withVehicle });
  },
  update(id: number, data: Prisma.FuelLogUpdateInput) {
    return prisma.fuelLog.update({ where: { id }, data, include: withVehicle });
  },
  delete(id: number) {
    return prisma.fuelLog.delete({ where: { id } });
  },
  /** Sum of fuel cost + liters for a vehicle (for operational cost / efficiency). */
  aggregateByVehicle(vehicleId: number) {
    return prisma.fuelLog.aggregate({ where: { vehicleId }, _sum: { cost: true, liters: true } });
  },
  /** Fuel cost + liters grouped by vehicle (for fleet analytics, no N+1). */
  groupByVehicle() {
    return prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true, liters: true } });
  },
};

export type FuelLogWithVehicle = NonNullable<
  Awaited<ReturnType<typeof fuelRepository.findById>>
>;
