import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import { createFuelLogSchema, listFuelLogsQuerySchema } from "@/lib/validation/fuel";
import { requirePermission } from "@/lib/auth/guards";
import { fuelService } from "@/lib/services/fuel.service";

export const dynamic = "force-dynamic";

/** GET /api/fuel-logs - list. Admin / Fleet Manager / Financial Analyst. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("fuel", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(listFuelLogsQuerySchema, Object.fromEntries(url.searchParams));
  return ok(await fuelService.list(query));
});

/** POST /api/fuel-logs - record a fuel log. Admin / Fleet Manager / Driver / Financial. */
export const POST = withErrorHandling(async (req) => {
  await requirePermission("fuel", "create");
  const input = await parseJsonBody(req, createFuelLogSchema);
  return created(await fuelService.create(input));
});
