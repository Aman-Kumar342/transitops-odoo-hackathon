/**
 * Maintenance domain constants. (problem.md §4.6, §6.6, §7.4)
 */

export const MAINTENANCE_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type MaintenanceStatusValue =
  (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatusValue, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
};

/** Common maintenance types (suggestions for the UI; type is free text, not a closed set). */
export const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tyre Replacement",
  "Brake Service",
  "Engine Repair",
  "General Service",
  "Inspection",
  "Other",
] as const;
