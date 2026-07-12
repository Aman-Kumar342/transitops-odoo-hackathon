import { z } from "zod";
import { MAINTENANCE_STATUS } from "@/lib/domain/maintenance";

/**
 * Maintenance input schemas. Shared by client forms and server handlers.
 * (guidelines.md §13; problem.md §5 R14, §9)
 */

const cost = z.coerce
  .number({ invalid_type_error: "Cost must be a number" })
  .nonnegative("Cost must be zero or greater");

const odometerAtService = z.coerce
  .number({ invalid_type_error: "Odometer must be a number" })
  .nonnegative("Odometer must be zero or greater")
  .optional();

export const createMaintenanceSchema = z.object({
  vehicleId: z.coerce.number({ invalid_type_error: "Select a vehicle" }).int().positive("Select a vehicle"),
  type: z.string({ required_error: "Type is required" }).trim().min(1, "Type is required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  cost: cost.optional().default(0),
  odometerAtService,
});

export const updateMaintenanceSchema = z.object({
  type: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  cost: cost.optional(),
  odometerAtService,
});

export const listMaintenanceQuerySchema = z.object({
  status: z.nativeEnum(MAINTENANCE_STATUS).optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["openedAt", "cost", "status"]).default("openedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
