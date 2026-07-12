import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { loginSchema } from "@/lib/validation/auth";
import { authService } from "@/lib/services/auth.service";
import { issueSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/login — authenticate and set the session cookie. Public. */
export const POST = withErrorHandling(async (req) => {
  const { email, password } = await parseJsonBody(req, loginSchema);
  const { claims, user } = await authService.login(email, password);

  const res = ok(user);
  await issueSessionCookie(res, claims);
  return res;
});
