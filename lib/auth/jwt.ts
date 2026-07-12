import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { RoleName } from "./rbac";

/**
 * JWT signing/verification via `jose` (works in both Node and Edge/middleware runtimes).
 * The token is the session; it is carried in an httpOnly cookie. (guidelines.md §14)
 */

export interface SessionClaims {
  userId: number;
  email: string;
  role: RoleName;
}

function getSecret(): Uint8Array {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured. See .env.example.");
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.userId))
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(getSecret());
}

/** Verifies a token and returns its claims, or null if invalid/expired. */
export async function verifySession(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = Number(payload.sub);
    const email = payload.email;
    const role = payload.role;
    if (!userId || typeof email !== "string" || typeof role !== "string") {
      return null;
    }
    return { userId, email, role: role as RoleName };
  } catch {
    return null;
  }
}
