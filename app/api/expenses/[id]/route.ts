import { withErrorHandling } from "@/lib/http/handler";
import { ok, noContent } from "@/lib/http/response";
import { parseJsonBody } from "@/lib/validation";
import { updateExpenseSchema } from "@/lib/validation/expense";
import { requirePermission } from "@/lib/auth/guards";
import { expenseService } from "@/lib/services/expense.service";
import { parseIdParam } from "@/lib/http/params";

export const dynamic = "force-dynamic";

/** GET /api/expenses/:id */
export const GET = withErrorHandling(async (_req, { params }) => {
  await requirePermission("expenses", "read");
  return ok(await expenseService.getById(parseIdParam(params.id)));
});

/** PUT /api/expenses/:id */
export const PUT = withErrorHandling(async (req, { params }) => {
  await requirePermission("expenses", "update");
  const input = await parseJsonBody(req, updateExpenseSchema);
  return ok(await expenseService.update(parseIdParam(params.id), input));
});

/** DELETE /api/expenses/:id */
export const DELETE = withErrorHandling(async (_req, { params }) => {
  await requirePermission("expenses", "delete");
  await expenseService.remove(parseIdParam(params.id));
  return noContent();
});
