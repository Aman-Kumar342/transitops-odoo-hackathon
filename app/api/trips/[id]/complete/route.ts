import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { completeTripSchema } from "@/lib/validation/trip";
import { requirePermission } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/trip.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/trips/:id/complete - complete a Dispatched trip (R7, transactional). */
export const POST = withErrorHandling(async (req, { params }) => {
  await requirePermission("trips", "update");
  const input = await parseJsonBody(req, completeTripSchema);
  return ok(await tripService.complete(parseIdParam(params.id), input));
});
