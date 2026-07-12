import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateVehicleSchema } from "@/lib/validation/vehicle";
import { requirePermission } from "@/lib/auth/guards";
import { vehicleService } from "@/lib/services/vehicle.service";
import { ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ValidationError("Invalid vehicle id");
  }
  return id;
}

/** GET /api/vehicles/:id — vehicle detail. Any authenticated role. */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("vehicles", "read");
  const vehicle = await vehicleService.getById(parseId(params.id));
  return ok(vehicle);
});

/** PUT /api/vehicles/:id — update. Admin / Fleet Manager only. */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("vehicles", "update");
  const input = await parseJsonBody(req, updateVehicleSchema);
  const vehicle = await vehicleService.update(parseId(params.id), input);
  return ok(vehicle);
});

/** DELETE /api/vehicles/:id — soft delete = Retire. Admin / Fleet Manager only. */
export const DELETE = withErrorHandling(async (_req, { params }) => {
  await requirePermission("vehicles", "delete");
  const vehicle = await vehicleService.retire(parseId(params.id));
  return ok(vehicle);
});
