import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { vehicleService } from "@/lib/services/vehicle.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/vehicles/available — the dispatch pool (Available only, R2). Used by trip
 * creation in Phase 4. Static segment resolves before the [id] route.
 */
export const GET = withErrorHandling(async () => {
  await requirePermission("vehicles", "read");
  const vehicles = await vehicleService.listAvailable();
  return ok(vehicles);
});
