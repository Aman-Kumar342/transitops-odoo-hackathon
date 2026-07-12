import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { costService } from "@/lib/services/cost.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/**
 * GET /api/vehicles/:id/operational-cost - Fuel + Maintenance cost for a vehicle (§3.7,
 * §14), plus other-expenses total (separate). Any authenticated role that can read
 * vehicles.
 */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("vehicles", "read");
  return ok(await costService.forVehicle(parseIdParam(params.id)));
});
