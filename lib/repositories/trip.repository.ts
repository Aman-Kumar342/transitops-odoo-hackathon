import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Trip data access. DB operations only - no business logic. (guidelines.md §9)
 * Transactional multi-row updates (dispatch/complete/cancel) are orchestrated by the
 * service using prisma.$transaction.
 */
const withParties = {
  vehicle: {
    select: { id: true, registrationNumber: true, nameModel: true, maxLoadCapacity: true, status: true, odometer: true },
  },
  driver: { select: { id: true, name: true, status: true } },
} satisfies Prisma.TripInclude;

export const tripRepository = {
  findMany(args: {
    where: Prisma.TripWhereInput;
    orderBy: Prisma.TripOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.trip.findMany({ ...args, include: withParties });
  },

  count(where: Prisma.TripWhereInput) {
    return prisma.trip.count({ where });
  },

  findById(id: number) {
    return prisma.trip.findUnique({ where: { id }, include: withParties });
  },

  create(data: Prisma.TripCreateInput) {
    return prisma.trip.create({ data, include: withParties });
  },

  update(id: number, data: Prisma.TripUpdateInput) {
    return prisma.trip.update({ where: { id }, data, include: withParties });
  },
};

export type TripWithParties = NonNullable<
  Awaited<ReturnType<typeof tripRepository.findById>>
>;
