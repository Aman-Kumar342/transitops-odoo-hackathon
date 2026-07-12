import type { Prisma } from "@prisma/client";
import { expenseRepository, type ExpenseWithVehicle } from "@/lib/repositories/expense.repository";
import { vehicleRepository } from "@/lib/repositories/vehicle.repository";
import { NotFoundError, BusinessRuleError } from "@/lib/http/errors";
import { parseIsoDate } from "@/lib/domain/date";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategoryValue } from "@/lib/domain/expense";
import type { CreateExpenseInput, UpdateExpenseInput, ListExpensesQuery } from "@/lib/validation/expense";

/**
 * Expense business logic (problem.md §4.7, §6.8, §18-E). A separate ledger from fuel and
 * maintenance so it never double-counts into operational cost. (guidelines.md §8)
 */

function toDTO(e: ExpenseWithVehicle) {
  const category = e.category as ExpenseCategoryValue;
  return {
    id: e.id,
    vehicle: { id: e.vehicle.id, registrationNumber: e.vehicle.registrationNumber, nameModel: e.vehicle.nameModel },
    tripId: e.tripId,
    category,
    categoryLabel: EXPENSE_CATEGORY_LABELS[category],
    amount: Number(e.amount),
    date: e.date.toISOString().slice(0, 10),
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  };
}
export type ExpenseDTO = ReturnType<typeof toDTO>;

export const expenseService = {
  async list(query: ListExpensesQuery) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.category) where.category = query.category;
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      expenseRepository.findMany({ where, orderBy: { [query.sort]: query.order }, skip, take: query.limit }),
      expenseRepository.count(where),
    ]);
    return {
      items: items.map(toDTO),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  },

  async getById(id: number): Promise<ExpenseDTO> {
    const e = await expenseRepository.findById(id);
    if (!e) throw NotFoundError("Expense not found");
    return toDTO(e);
  },

  async create(input: CreateExpenseInput): Promise<ExpenseDTO> {
    const vehicle = await vehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw BusinessRuleError("Selected vehicle does not exist", { vehicleId: ["Not found"] });
    const created = await expenseRepository.create({
      vehicle: { connect: { id: input.vehicleId } },
      trip: input.tripId ? { connect: { id: input.tripId } } : undefined,
      category: input.category,
      amount: input.amount,
      date: parseIsoDate(input.date),
      description: input.description ?? null,
    });
    return toDTO(created);
  },

  async update(id: number, input: UpdateExpenseInput): Promise<ExpenseDTO> {
    const existing = await expenseRepository.findById(id);
    if (!existing) throw NotFoundError("Expense not found");
    const data: Prisma.ExpenseUpdateInput = {};
    if (input.category !== undefined) data.category = input.category;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.date !== undefined) data.date = parseIsoDate(input.date);
    if (input.description !== undefined) data.description = input.description ?? null;
    if (input.tripId !== undefined) data.trip = input.tripId ? { connect: { id: input.tripId } } : { disconnect: true };
    const updated = await expenseRepository.update(id, data);
    return toDTO(updated);
  },

  async remove(id: number): Promise<void> {
    const existing = await expenseRepository.findById(id);
    if (!existing) throw NotFoundError("Expense not found");
    await expenseRepository.delete(id);
  },
};
