import { withErrorHandling } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/response";
import { parseJsonBody, parseOrThrow } from "@/lib/validation";
import { createExpenseSchema, listExpensesQuerySchema } from "@/lib/validation/expense";
import { requirePermission } from "@/lib/auth/guards";
import { expenseService } from "@/lib/services/expense.service";

export const dynamic = "force-dynamic";

/** GET /api/expenses - list. Admin / Fleet Manager / Financial Analyst. */
export const GET = withErrorHandling(async (req) => {
  await requirePermission("expenses", "read");
  const url = new URL(req.url);
  const query = parseOrThrow(listExpensesQuerySchema, Object.fromEntries(url.searchParams));
  return ok(await expenseService.list(query));
});

/** POST /api/expenses - record an expense. Admin / Fleet Manager / Financial Analyst. */
export const POST = withErrorHandling(async (req) => {
  await requirePermission("expenses", "create");
  const input = await parseJsonBody(req, createExpenseSchema);
  return created(await expenseService.create(input));
});
