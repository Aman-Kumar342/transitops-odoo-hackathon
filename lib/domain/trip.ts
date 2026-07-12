/**
 * Trip domain constants - single source of truth shared by validation, services, and
 * UI. (problem.md §4.5, §6.5, §7.3)
 */

/** Trip lifecycle states (§3.5) - closed set, matches the Prisma/Postgres enum. */
export const TRIP_STATUS = {
  DRAFT: "DRAFT",
  DISPATCHED: "DISPATCHED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TripStatusValue = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];

export const TRIP_STATUS_LABELS: Record<TripStatusValue, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Valid trip transitions (§7.3). Completed and Cancelled are terminal.
 *  - Draft -> Dispatched (dispatch: R6 side effects)
 *  - Draft -> Cancelled (no side effects, never dispatched)
 *  - Dispatched -> Completed (R7 side effects + odometer/fuel/revenue)
 *  - Dispatched -> Cancelled (R8 side effects)
 */
export const TRIP_TRANSITIONS: Record<TripStatusValue, TripStatusValue[]> = {
  DRAFT: [TRIP_STATUS.DISPATCHED, TRIP_STATUS.CANCELLED],
  DISPATCHED: [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: TripStatusValue,
  to: TripStatusValue,
): boolean {
  return TRIP_TRANSITIONS[from].includes(to);
}
