import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — clear the session cookie. Idempotent; safe without a valid
 *  session (e.g. after expiry). */
export const POST = withErrorHandling(async () => {
  const res = ok({ loggedOut: true });
  clearSessionCookie(res);
  return res;
});
