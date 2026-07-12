import { z } from "zod";
import { isFutureDate } from "@/lib/domain/date";
import { EXPENSE_CATEGORY } from "@/lib/domain/expense";

/**
 * Expense input schemas. Shared by client forms and server handlers.
 * (guidelines.md §13; problem.md §5 R14, §9)
 */

const dateNotFuture = z
  .string({ required_error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)")
  .refine((s) => !isFutureDate(s), { message: "Date cannot be in the future" });

export const createExpenseSchema = z.object({
  vehicleId: z.coerce.number({ invalid_type_error: "Select a vehicle" }).int().positive("Select a vehicle"),
  tripId: z.coerce.number().int().positive().optional(),
  category: z.nativeEnum(EXPENSE_CATEGORY, { errorMap: () => ({ message: "Select a category" }) }),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number" }).nonnegative("Amount must be zero or greater"),
  date: dateNotFuture,
  description: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
});

export const updateExpenseSchema = createExpenseSchema.partial().omit({ vehicleId: true });

export const listExpensesQuerySchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  category: z.nativeEnum(EXPENSE_CATEGORY).optional(),
  sort: z.enum(["date", "amount"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
