import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { changePasswordSchema } from "@/lib/validation/auth";
import { requireSession } from "@/lib/auth/guards";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

/** PUT /api/auth/password — change the current user's password. Requires a session. */
export const PUT = withErrorHandling(async (req) => {
  const session = await requireSession();
  const { currentPassword, newPassword } = await parseJsonBody(
    req,
    changePasswordSchema,
  );
  await authService.changePassword(session.userId, currentPassword, newPassword);
  return ok({ updated: true });
});
