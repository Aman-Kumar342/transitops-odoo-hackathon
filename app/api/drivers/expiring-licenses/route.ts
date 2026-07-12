import { z } from "zod";
import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseOrThrow } from "@/lib/validation";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/drivers/expiring-licenses?days=30 - drivers whose license expires within N
 * days (or already expired). The in-app expiring-license reminder (bonus, PDF §8).
 */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("drivers", "read");
  const url = new URL(req.url);
  const { days } = parseOrThrow(querySchema, Object.fromEntries(url.searchParams));
  return ok(await driverService.listExpiring(days));
});
