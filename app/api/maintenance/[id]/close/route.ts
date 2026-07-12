import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { requirePermission } from "@/lib/auth/guards";
import { maintenanceService } from "@/lib/services/maintenance.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/maintenance/:id/close - close a record and restore the vehicle (R10, txn). */
export const POST = withErrorHandling(async (_req, { params }) => {
  await requirePermission("maintenance", "update");
  return ok(await maintenanceService.close(parseIdParam(params.id)));
});
