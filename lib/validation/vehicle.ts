import { z } from "zod";
import { VEHICLE_TYPES, normalizeRegistration, VEHICLE_STATUS } from "@/lib/domain/vehicle";

/**
 * Vehicle input schemas. Shared by client forms (UX) and server handlers
 * (authoritative). Numbers use coercion so string form inputs validate cleanly.
 * (guidelines.md §13; problem.md §5 R1/R14, §9)
 */

const registrationNumber = z
  .string({ required_error: "Registration number is required" })
  .trim()
  .min(1, "Registration number is required")
  .max(32, "Registration number is too long")
  .transform(normalizeRegistration);

const capacity = z.coerce
  .number({ invalid_type_error: "Capacity must be a number" })
  .positive("Capacity must be greater than zero");

const odometer = z.coerce
  .number({ invalid_type_error: "Odometer must be a number" })
  .nonnegative("Odometer must be zero or greater");

const acquisitionCost = z.coerce
  .number({ invalid_type_error: "Acquisition cost must be a number" })
  .nonnegative("Acquisition cost must be zero or greater");

const region = z
  .string()
  .trim()
  .max(80, "Region is too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createVehicleSchema = z.object({
  registrationNumber,
  nameModel: z
    .string({ required_error: "Name/model is required" })
    .trim()
    .min(1, "Name/model is required")
    .max(120, "Name/model is too long"),
  type: z.enum(VEHICLE_TYPES, {
    errorMap: () => ({ message: "Select a valid vehicle type" }),
  }),
  maxLoadCapacity: capacity,
  odometer: odometer.optional().default(0),
  acquisitionCost,
  region,
});

/** All fields optional for a partial update; registration re-normalized if present. */
export const updateVehicleSchema = createVehicleSchema.partial();

/** Query params for listing (filters, search, sort, pagination). */
export const listVehiclesQuerySchema = z.object({
  status: z.nativeEnum(VEHICLE_STATUS).optional(),
  type: z.enum(VEHICLE_TYPES).optional(),
  region: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  registrationNumber: z.string().trim().min(1).optional(), // exact (async uniqueness check)
  sort: z
    .enum(["createdAt", "registrationNumber", "nameModel", "odometer", "acquisitionCost"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
