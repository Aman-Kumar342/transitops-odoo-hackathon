import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requireSession } from "@/lib/auth/guards";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/** GET /api/auth/me — the authenticated user's profile. Requires a valid session. */
export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const user = await authService.getCurrentUser(session.userId);
  return ok(user);
});
