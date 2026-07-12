import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import {
  createVehicleSchema,
  listVehiclesQuerySchema,
} from "@/lib/validation/vehicle";
import { requirePermission } from "@/lib/auth/guards";
import { vehicleService } from "@/lib/services/vehicle.service";

export const dynamic = "force-dynamic";

/** GET /api/vehicles — list with filters/search/sort/pagination. Any authenticated role. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("vehicles", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(
    listVehiclesQuerySchema,
    Object.fromEntries(url.searchParams),
  );
  const result = await vehicleService.list(query);
  return ok(result);
});

/** POST /api/vehicles — create a vehicle. Admin / Fleet Manager only. */
export const POST = withErrorHandling(async (req) => {
  await requirePermission("vehicles", "create");
  const input = await parseJsonBody(req, createVehicleSchema);
  const vehicle = await vehicleService.create(input);
  return created(vehicle);
});
