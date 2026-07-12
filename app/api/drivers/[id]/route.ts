import { withErrorHandling } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateDriverSchema } from "@/lib/validation/driver";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** GET /api/drivers/:id — driver detail. Any authenticated role. */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("drivers", "read");
  return ok(await driverService.getById(parseIdParam(params.id)));
});

/** PUT /api/drivers/:id — update. Admin / Safety Officer only. */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("drivers", "update");
  const input = await parseJsonBody(req, updateDriverSchema);
  return ok(await driverService.update(parseIdParam(params.id), input));
});

/** DELETE /api/drivers/:id — soft delete / deactivate. Admin / Safety Officer only. */
export const DELETE = withErrorHandling(async (_req, { params }) => {
  await requirePermission("drivers", "delete");
  await driverService.softDelete(parseIdParam(params.id));
  return noContent();
});
