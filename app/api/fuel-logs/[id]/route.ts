import { withErrorHandling } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateFuelLogSchema } from "@/lib/validation/fuel";
import { requirePermission } from "@/lib/auth/guards";
import { fuelService } from "@/lib/services/fuel.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** GET /api/fuel-logs/:id */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("fuel", "read");
  return ok(await fuelService.getById(parseIdParam(params.id)));
});

/** PUT /api/fuel-logs/:id */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("fuel", "update");
  const input = await parseJsonBody(req, updateFuelLogSchema);
  return ok(await fuelService.update(parseIdParam(params.id), input));
});

/** DELETE /api/fuel-logs/:id */
export const DELETE = withErrorHandling(async (_req, { params }) => {
  await requirePermission("fuel", "delete");
  await fuelService.remove(parseIdParam(params.id));
  return noContent();
});
