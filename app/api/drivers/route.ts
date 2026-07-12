import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import { createDriverSchema, listDriversQuerySchema } from "@/lib/validation/driver";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";

export const dynamic = "force-dynamic";

/** GET /api/drivers — list with filters/search/sort/pagination. Any authenticated role. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("drivers", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(
    listDriversQuerySchema,
    Object.fromEntries(url.searchParams),
  );
  return ok(await driverService.list(query));
});

/** POST /api/drivers — create a driver. Admin / Safety Officer only. */
export const POST = withErrorHandling(async (req) => {
  await requirePermission("drivers", "create");
  const input = await parseJsonBody(req, createDriverSchema);
  return created(await driverService.create(input));
});
