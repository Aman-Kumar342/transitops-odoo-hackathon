import { z } from "zod";
import { isFutureDate } from "@/lib/domain/date";

/**
 * Fuel-log input schemas. Shared by client forms and server handlers.
 * (guidelines.md §13; problem.md §5 R14, §9)
 */

const dateNotFuture = z
  .string({ required_error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)")
  .refine((s) => !isFutureDate(s), { message: "Date cannot be in the future" });

export const createFuelLogSchema = z.object({
  vehicleId: z.coerce.number({ invalid_type_error: "Select a vehicle" }).int().positive("Select a vehicle"),
  tripId: z.coerce.number().int().positive().optional(),
  liters: z.coerce.number({ invalid_type_error: "Liters must be a number" }).positive("Liters must be greater than zero"),
  cost: z.coerce.number({ invalid_type_error: "Cost must be a number" }).nonnegative("Cost must be zero or greater"),
  date: dateNotFuture,
  odometer: z.coerce.number().nonnegative("Odometer must be zero or greater").optional(),
  notes: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
});

export const updateFuelLogSchema = createFuelLogSchema.partial().omit({ vehicleId: true });

export const listFuelLogsQuerySchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  tripId: z.coerce.number().int().positive().optional(),
  sort: z.enum(["date", "cost", "liters"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
export type UpdateFuelLogInput = z.infer<typeof updateFuelLogSchema>;
export type ListFuelLogsQuery = z.infer<typeof listFuelLogsQuerySchema>;
