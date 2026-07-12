import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseOrThrow } from "@/lib/validation";
import { dashboardQuerySchema } from "@/lib/validation/dashboard";
import { requirePermission } from "@/lib/auth/guards";
import { dashboardService } from "@/lib/services/dashboard.service";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/kpis?type=&status=&region= - the 7 KPIs + status breakdown. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("dashboard", "read");
  const url = new URL(req.url);
  const filters = parseOrThrow(dashboardQuerySchema, Object.fromEntries(url.searchParams));
  return ok(await dashboardService.getKpis(filters));
});
