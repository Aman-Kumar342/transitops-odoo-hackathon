import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import { createMaintenanceSchema, listMaintenanceQuerySchema } from "@/lib/validation/maintenance";
import { requirePermission } from "@/lib/auth/guards";
import { maintenanceService } from "@/lib/services/maintenance.service";

export const dynamic = "force-dynamic";

/** GET /api/maintenance - list. Admin / Fleet Manager / Financial Analyst. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("maintenance", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(listMaintenanceQuerySchema, Object.fromEntries(url.searchParams));
  return ok(await maintenanceService.list(query));
});

/** POST /api/maintenance - open a maintenance record (R9). Admin / Fleet Manager. */
export const POST = withErrorHandling(async (req) => {
  await requirePermission("maintenance", "create");
  const input = await parseJsonBody(req, createMaintenanceSchema);
  return created(await maintenanceService.open(input));
});
