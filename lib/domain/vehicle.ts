/**
 * Vehicle domain constants — single source of truth shared by validation, services,
 * and UI. (problem.md §4.3, §6.3, §7.1)
 */

/**
 * Vehicle types. The PDF requires "Type" and the validation matrix (§9) says type ∈ enum,
 * but does not enumerate the set — this list is a documented assumption (§18). Enforced
 * at the API (zod) and the DB (CHECK constraint).
 */
export const VEHICLE_TYPES = [
  "Truck",
  "Van",
  "Car",
  "Bus",
  "Trailer",
  "Other",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** Vehicle status values (§3.3) — closed set, matches the Prisma/Postgres enum. */
export const VEHICLE_STATUS = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  IN_SHOP: "IN_SHOP",
  RETIRED: "RETIRED",
} as const;
export type VehicleStatusValue =
  (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

/** Human-readable labels for the UI. */
export const VEHICLE_STATUS_LABELS: Record<VehicleStatusValue, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  IN_SHOP: "In Shop",
  RETIRED: "Retired",
};

/**
 * Normalizes a registration number so uniqueness is case/whitespace-insensitive (§18-J).
 * Trim, collapse internal whitespace, uppercase. The DB also enforces this normalized
 * form via CHECK constraints, so invalid values are rejected even if the API is bypassed.
 */
export function normalizeRegistration(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}
