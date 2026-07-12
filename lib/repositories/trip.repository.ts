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
  /** Completed-trip revenue + distance + fuel consumed grouped by vehicle (for ROI /
   *  efficiency). Fuel efficiency uses fuel CONSUMED on trips, not fuel purchased. */
  groupCompletedByVehicle() {
    return prisma.trip.groupBy({
      by: ["vehicleId"],
      where: { status: "COMPLETED" },
      _sum: { revenue: true, plannedDistance: true, fuelConsumed: true },
    });
  },

  /** Completed-trip count grouped by driver (for the driver "Trip Compl." column). */
  groupCompletedCountByDriver() {
    return prisma.trip.groupBy({
      by: ["driverId"],
      where: { status: "COMPLETED" },
      _count: { _all: true },
    });
  },
  /** Completed trips' revenue + completion date (for the monthly-revenue chart). */
  completedRevenueSeries() {
    return prisma.trip.findMany({
      where: { status: "COMPLETED", completedAt: { not: null }, revenue: { not: null } },
      select: { revenue: true, completedAt: true },
    });
  },
};

export type TripWithParties = NonNullable<
  Awaited<ReturnType<typeof tripRepository.findById>>
>;
