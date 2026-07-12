import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { analyticsService } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

/** GET /api/analytics - fleet analytics summary + per-vehicle metrics + monthly revenue. */
export const GET = withErrorHandling(async () => {
  await requirePermission("reports", "read");
  return ok(await analyticsService.getReport());
});
