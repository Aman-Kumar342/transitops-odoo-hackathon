/**
 * Role-Based Access Control policy.
 *
 * This is the single, authoritative encoding of the permission matrix in
 * docs/problem.md §3. Guards (lib/auth/guards.ts) and services consult `can()`; the
 * policy lives ONLY here so it is never duplicated or drifts. Deny-by-default: any
 * (role, resource, action) not explicitly granted is denied. (guidelines.md §8, §14)
 */

export const ROLES = {
  ADMIN: "Admin",
  FLEET_MANAGER: "Fleet Manager",
  DRIVER: "Driver",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: RoleName[] = Object.values(ROLES);

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.ADMIN]: "System administration: users, roles, full access.",
  [ROLES.FLEET_MANAGER]:
    "Owns fleet assets, maintenance, vehicle lifecycle, and dispatch.",
  [ROLES.DRIVER]: "Creates and operates trips; monitors active deliveries.",
  [ROLES.SAFETY_OFFICER]:
    "Guards driver compliance: licenses, suspensions, safety scores.",
  [ROLES.FINANCIAL_ANALYST]:
    "Reviews fuel, expenses, maintenance costs, and profitability.",
};

export type Resource =
  | "users"
  | "roles"
  | "vehicles"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel"
  | "expenses"
  | "dashboard"
  | "reports";

export type Action = "create" | "read" | "update" | "delete";

const CRUD: Action[] = ["create", "read", "update", "delete"];

/**
 * Permission matrix — mirrors docs/problem.md §3. Object-level nuances (e.g. a Driver
 * reading only their own user record) are enforced additionally in services; this
 * matrix is the role-level gate.
 */
const MATRIX: Record<RoleName, Partial<Record<Resource, Action[]>>> = {
  [ROLES.ADMIN]: {
    users: CRUD,
    roles: CRUD,
    vehicles: CRUD,
    drivers: CRUD,
    trips: CRUD,
    maintenance: CRUD,
    fuel: CRUD,
    expenses: CRUD,
    dashboard: ["read"],
    reports: CRUD,
  },
  [ROLES.FLEET_MANAGER]: {
    users: ["read"],
    vehicles: CRUD,
    drivers: ["read"],
    trips: CRUD,
    maintenance: CRUD,
    fuel: ["create", "read"],
    expenses: ["create", "read"],
    dashboard: ["read"],
    reports: ["read"],
  },
  [ROLES.DRIVER]: {
    users: ["read"],
    vehicles: ["read"],
    drivers: ["read"],
    trips: ["create", "read", "update"],
    fuel: ["create"],
    dashboard: ["read"],
    reports: ["read"],
  },
  [ROLES.SAFETY_OFFICER]: {
    users: ["read"],
    vehicles: ["read"],
    drivers: CRUD,
    trips: ["read"],
    dashboard: ["read"],
    reports: ["read"],
  },
  [ROLES.FINANCIAL_ANALYST]: {
    users: ["read"],
    vehicles: ["read"],
    drivers: ["read"],
    trips: ["read"],
    maintenance: ["read"],
    fuel: CRUD,
    expenses: CRUD,
    dashboard: ["read"],
    reports: CRUD,
  },
};

export function isKnownRole(name: string): name is RoleName {
  return (ALL_ROLES as string[]).includes(name);
}

/** Returns true iff the role is granted `action` on `resource`. Deny-by-default. */
export function can(role: string, resource: Resource, action: Action): boolean {
  if (!isKnownRole(role)) return false;
  const allowed = MATRIX[role][resource];
  return Boolean(allowed?.includes(action));
}
