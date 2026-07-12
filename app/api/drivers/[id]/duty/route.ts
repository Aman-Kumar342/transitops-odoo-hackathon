import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { driverDutySchema } from "@/lib/validation/driver";
import { requirePermission } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/driver.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** POST /api/drivers/:id/duty — clock in/out: Available ↔ Off Duty (§7.2). Admin / Safety Officer. */
export const POST = withErrorHandling(async (req, { params }) => {
  await requirePermission("drivers", "update");
  const { onDuty } = await parseJsonBody(req, driverDutySchema);
  return ok(await driverService.setDuty(parseIdParam(params.id), onDuty));
});
