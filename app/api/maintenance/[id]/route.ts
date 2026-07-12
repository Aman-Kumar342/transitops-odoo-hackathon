import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateMaintenanceSchema } from "@/lib/validation/maintenance";
import { requirePermission } from "@/lib/auth/guards";
import { maintenanceService } from "@/lib/services/maintenance.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** GET /api/maintenance/:id - detail. Admin / Fleet Manager / Financial Analyst. */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("maintenance", "read");
  return ok(await maintenanceService.getById(parseIdParam(params.id)));
});

/** PUT /api/maintenance/:id - edit fields. Admin / Fleet Manager. */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("maintenance", "update");
  const input = await parseJsonBody(req, updateMaintenanceSchema);
  return ok(await maintenanceService.update(parseIdParam(params.id), input));
});
