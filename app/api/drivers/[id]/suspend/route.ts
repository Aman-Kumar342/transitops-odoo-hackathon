import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/drivers/:id/suspend — suspend (§7.2). Admin / Safety Officer. Blocked if On Trip. */
export const POST = withErrorHandling(async (_req, { params }) => {
  await requirePermission("drivers", "update");
  return ok(await driverService.suspend(parseIdParam(params.id)));
});
