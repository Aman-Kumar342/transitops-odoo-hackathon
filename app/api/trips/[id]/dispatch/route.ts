import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/trip.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/trips/:id/dispatch - dispatch a Draft trip (R6, transactional). */
export const POST = withErrorHandling(async (_req, { params }) => {
  await requirePermission("trips", "update");
  return ok(await tripService.dispatch(parseIdParam(params.id)));
});
