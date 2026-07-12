import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/drivers/available — the dispatch pool: eligible drivers only (R3 — Available,
 * license not expired, not deleted). Used by trip creation in Phase 4.
 */
export const GET = withErrorHandling(async () => {
  await requirePermission("drivers", "read");
  return ok(await driverService.listAvailable());
});
