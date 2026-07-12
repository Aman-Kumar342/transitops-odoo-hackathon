import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Driver data access. DB operations only — no business logic. (guidelines.md §9)
 */
export const driverRepository = {
  findMany(args: {
    where: Prisma.DriverWhereInput;
    orderBy: Prisma.DriverOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.driver.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
    });
  },

  count(where: Prisma.DriverWhereInput) {
    return prisma.driver.count({ where });
  },

  findById(id: number) {
    return prisma.driver.findUnique({ where: { id } });
  },

  findByLicenseNumber(licenseNumber: string) {
    return prisma.driver.findUnique({ where: { licenseNumber } });
  },

  create(data: Prisma.DriverCreateInput) {
    return prisma.driver.create({ data });
  },

  update(id: number, data: Prisma.DriverUpdateInput) {
    return prisma.driver.update({ where: { id }, data });
  },
};
