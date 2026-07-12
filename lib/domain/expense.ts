/**
 * Expense domain constants. (problem.md §4.7, §6.8, §18-E)
 * Categories deliberately exclude Fuel and Maintenance - those live in their own tables
 * (fuel_logs, maintenance_logs) and are the single sources of truth for operational cost.
 */

export const EXPENSE_CATEGORY = {
  TOLL: "TOLL",
  PARKING: "PARKING",
  INSURANCE: "INSURANCE",
  FINE: "FINE",
  MISC: "MISC",
} as const;
export type ExpenseCategoryValue =
  (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryValue, string> = {
  TOLL: "Toll",
  PARKING: "Parking",
  INSURANCE: "Insurance",
  FINE: "Fine",
  MISC: "Miscellaneous",
};

export const EXPENSE_CATEGORIES = Object.values(EXPENSE_CATEGORY);
