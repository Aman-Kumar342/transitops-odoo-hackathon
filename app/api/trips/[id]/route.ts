import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateTripSchema } from "@/lib/validation/trip";
import { requirePermission } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/trip.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** GET /api/trips/:id - trip detail. Any authenticated role. */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("trips", "read");
  return ok(await tripService.getById(parseIdParam(params.id)));
});

/** PUT /api/trips/:id - edit a Draft trip. Admin / Fleet Manager / Driver. */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("trips", "update");
  const input = await parseJsonBody(req, updateTripSchema);
  return ok(await tripService.update(parseIdParam(params.id), input));
});
