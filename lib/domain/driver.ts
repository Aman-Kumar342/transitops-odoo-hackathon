/**
 * Driver domain constants — single source of truth shared by validation, services,
 * and UI. (problem.md §4.4, §6.4, §7.2)
 */

/**
 * License categories. PDF requires "License Category" and the validation matrix says
 * it ∈ a set, but doesn't enumerate it — this list is a documented assumption (§18).
 * Enforced at the API (zod) and the DB (CHECK constraint).
 */
export const LICENSE_CATEGORIES = [
  "LMV", // Light Motor Vehicle
  "HMV", // Heavy Motor Vehicle
  "MCWG", // Motorcycle with Gear
  "Trailer",
  "Other",
] as const;
export type LicenseCategory = (typeof LICENSE_CATEGORIES)[number];

/** Driver status values (§3.4) — closed set, matches the Prisma/Postgres enum. */
export const DRIVER_STATUS = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  OFF_DUTY: "OFF_DUTY",
  SUSPENDED: "SUSPENDED",
} as const;
export type DriverStatusValue =
  (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];

export const DRIVER_STATUS_LABELS: Record<DriverStatusValue, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  OFF_DUTY: "Off Duty",
  SUSPENDED: "Suspended",
};

/**
 * Allowed MANUAL status transitions (§7.2). Dispatch transitions (→/from ON_TRIP) are
 * driven by the trip service in Phase 4 and are NOT permitted here. This map is the
 * single authority for manual transitions:
 *  - Available ↔ Off Duty (clock in/out)
 *  - Available/Off Duty → Suspended (suspend)
 *  - Suspended → Available (reinstate)
 *  - On Trip → (none manually) — must complete/cancel the trip first.
 */
export const DRIVER_MANUAL_TRANSITIONS: Record<
  DriverStatusValue,
  DriverStatusValue[]
> = {
  AVAILABLE: [DRIVER_STATUS.OFF_DUTY, DRIVER_STATUS.SUSPENDED],
  OFF_DUTY: [DRIVER_STATUS.AVAILABLE, DRIVER_STATUS.SUSPENDED],
  SUSPENDED: [DRIVER_STATUS.AVAILABLE],
  ON_TRIP: [],
};

export function canManuallyTransition(
  from: DriverStatusValue,
  to: DriverStatusValue,
): boolean {
  return DRIVER_MANUAL_TRANSITIONS[from].includes(to);
}

/** Normalizes a license number for case/whitespace-insensitive uniqueness (R17). */
export function normalizeLicense(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** UTC date at 00:00 for "today" — the boundary for license-expiry checks (§18-M). */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * A license is expired iff its expiry date is before today (§18-H): a license expiring
 * *today* is still valid today.
 */
export function isLicenseExpired(expiry: Date, today = todayUtc()): boolean {
  return expiry.getTime() < today.getTime();
}

/**
 * Driver is eligible for dispatch (R3) iff: Available, not soft-deleted, and license not
 * expired. (Suspended/Off Duty/On Trip are excluded by the status check.)
 */
export function isDriverEligible(driver: {
  status: DriverStatusValue;
  licenseExpiryDate: Date;
  deletedAt: Date | null;
}): boolean {
  return (
    driver.status === DRIVER_STATUS.AVAILABLE &&
    driver.deletedAt === null &&
    !isLicenseExpired(driver.licenseExpiryDate)
  );
}
