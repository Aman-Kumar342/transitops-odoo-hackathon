import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Vehicle data access. DB operations only — no business logic. (guidelines.md §9)
 */
export const vehicleRepository = {
  findMany(args: {
    where: Prisma.VehicleWhereInput;
    orderBy: Prisma.VehicleOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.vehicle.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
    });
  },

  count(where: Prisma.VehicleWhereInput) {
    return prisma.vehicle.count({ where });
  },

  findById(id: number) {
    return prisma.vehicle.findUnique({ where: { id } });
  },

  findByRegistrationNumber(registrationNumber: string) {
    return prisma.vehicle.findUnique({ where: { registrationNumber } });
  },

  create(data: Prisma.VehicleCreateInput) {
    return prisma.vehicle.create({ data });
  },

  update(id: number, data: Prisma.VehicleUpdateInput) {
    return prisma.vehicle.update({ where: { id }, data });
  },

  /** Distinct non-null regions (for the dashboard region filter). */
  async distinctRegions(): Promise<string[]> {
    const rows = await prisma.vehicle.findMany({
      where: { region: { not: null } },
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" },
    });
    return rows.map((r) => r.region).filter((r): r is string => r !== null);
  },
};
