import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "./constants";
import { signSession, verifySession, type SessionClaims } from "./jwt";

/**
 * Session cookie helpers for the Node (route-handler) runtime.
 *
 * Middleware does NOT use this module (it can't use next/headers) — it verifies tokens
 * from `req.cookies` directly. This file is for route handlers reading/writing the
 * session cookie.
 */

export type Session = SessionClaims;

const ONE_DAY_SECONDS = 60 * 60 * 24;

/** Reads and verifies the current session from the request cookies, or null. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Cookie options — httpOnly (no JS access), sameSite lax, secure in production. */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  };
}

/** Signs a session and sets it on the outgoing response cookies. */
export async function issueSessionCookie(
  res: { cookies: { set: (name: string, value: string, opts: object) => void } },
  claims: SessionClaims,
): Promise<void> {
  const token = await signSession(claims);
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
}

/** Clears the session cookie on the outgoing response. */
export function clearSessionCookie(res: {
  cookies: { set: (name: string, value: string, opts: object) => void };
}): void {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
