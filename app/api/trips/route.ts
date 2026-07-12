import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import { createTripSchema, listTripsQuerySchema } from "@/lib/validation/trip";
import { requirePermission } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/trip.service";

export const dynamic = "force-dynamic";

/** GET /api/trips - list with filters/search/pagination. Any authenticated role. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("trips", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(listTripsQuerySchema, Object.fromEntries(url.searchParams));
  return ok(await tripService.list(query));
});

/** POST /api/trips - create a Draft trip. Admin / Fleet Manager / Driver. */
export const POST = withErrorHandling(async (req) => {
  const session = await requirePermission("trips", "create");
  const input = await parseJsonBody(req, createTripSchema);
  return created(await tripService.create(input, session.userId));
});
