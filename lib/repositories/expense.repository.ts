import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Expense data access. DB operations only. (guidelines.md §9) */
const withVehicle = {
  vehicle: { select: { id: true, registrationNumber: true, nameModel: true } },
} satisfies Prisma.ExpenseInclude;

export const expenseRepository = {
  findMany(args: {
    where: Prisma.ExpenseWhereInput;
    orderBy: Prisma.ExpenseOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.expense.findMany({ ...args, include: withVehicle });
  },
  count(where: Prisma.ExpenseWhereInput) {
    return prisma.expense.count({ where });
  },
  findById(id: number) {
    return prisma.expense.findUnique({ where: { id }, include: withVehicle });
  },
  create(data: Prisma.ExpenseCreateInput) {
    return prisma.expense.create({ data, include: withVehicle });
  },
  update(id: number, data: Prisma.ExpenseUpdateInput) {
    return prisma.expense.update({ where: { id }, data, include: withVehicle });
  },
  delete(id: number) {
    return prisma.expense.delete({ where: { id } });
  },
  /** Sum of expense amounts for a vehicle (separate from operational cost). */
  aggregateByVehicle(vehicleId: number) {
    return prisma.expense.aggregate({ where: { vehicleId }, _sum: { amount: true } });
  },
};

export type ExpenseWithVehicle = NonNullable<
  Awaited<ReturnType<typeof expenseRepository.findById>>
>;
