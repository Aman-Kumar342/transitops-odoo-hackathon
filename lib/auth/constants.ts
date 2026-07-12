/** Auth constants shared across node + edge (middleware) runtimes. Keep this file free
 *  of Node-only imports so it is safe to import from middleware. */

export const SESSION_COOKIE = "transitops_session";

/** Public paths that never require authentication. */
export const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
];
