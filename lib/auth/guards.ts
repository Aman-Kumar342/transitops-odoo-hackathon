import { getSession, type Session } from "./session";
import { can, type Resource, type Action } from "./rbac";
import { UnauthenticatedError, ForbiddenError } from "@/lib/http/errors";

/**
 * Authorization guards for route handlers. Server-side is the authoritative gate
 * (guidelines.md §13, §14). Handlers call these; on failure they throw typed errors
 * that the route wrapper maps to 401/403.
 */

/** Requires a valid session; throws 401 otherwise. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw UnauthenticatedError();
  return session;
}

/** Requires a valid session AND the given permission; throws 401/403 otherwise. */
export async function requirePermission(
  resource: Resource,
  action: Action,
): Promise<Session> {
  const session = await requireSession();
  if (!can(session.role, resource, action)) {
    throw ForbiddenError();
  }
  return session;
}
