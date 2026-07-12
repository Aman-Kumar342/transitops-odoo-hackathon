import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/drivers/:id/reinstate — reinstate a suspended driver (§7.2). Admin / Safety Officer. */
export const POST = withErrorHandling(async (_req, { params }) => {
  await requirePermission("drivers", "update");
  return ok(await driverService.reinstate(parseIdParam(params.id)));
});
