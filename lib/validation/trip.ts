import { z } from "zod";
import { TRIP_STATUS } from "@/lib/domain/trip";

/**
 * Trip input schemas. Shared by client forms (UX) and server handlers (authoritative).
 * (guidelines.md §13; problem.md §5 R5/R11, §9)
 */

const id = z.coerce
  .number({ invalid_type_error: "Required" })
  .int()
  .positive("Required");

const cargoWeight = z.coerce
  .number({ invalid_type_error: "Cargo weight must be a number" })
  .positive("Cargo weight must be greater than zero");

const plannedDistance = z.coerce
  .number({ invalid_type_error: "Distance must be a number" })
  .nonnegative("Distance must be zero or greater");

const nonEmpty = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(160);

export const createTripSchema = z.object({
  source: nonEmpty("Source"),
  destination: nonEmpty("Destination"),
  vehicleId: id,
  driverId: id,
  cargoWeight,
  plannedDistance,
});

/** Draft-only edit. */
export const updateTripSchema = createTripSchema.partial();

/** Completion input (§18-F/§18-G): final odometer + fuel + optional revenue. */
export const completeTripSchema = z.object({
  finalOdometer: z.coerce
    .number({ invalid_type_error: "Final odometer must be a number" })
    .nonnegative("Final odometer must be zero or greater"),
  fuelConsumed: z.coerce
    .number({ invalid_type_error: "Fuel consumed must be a number" })
    .positive("Fuel consumed must be greater than zero"),
  revenue: z.coerce
    .number({ invalid_type_error: "Revenue must be a number" })
    .nonnegative("Revenue must be zero or greater")
    .optional(),
});

export const listTripsQuerySchema = z.object({
  status: z.nativeEnum(TRIP_STATUS).optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  driverId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["createdAt", "status"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;
