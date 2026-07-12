import { withErrorHandling } from "@/lib/http/handler";
import { ok } from "@/lib/http/response";
import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/db";

// Health reflects live runtime state (DB reachability); never statically prerender it.
export const dynamic = "force-dynamic";

/**
 * Health endpoint — confirms the app is up and reports database reachability.
 * Public (no auth). Never throws on a DB outage; it reports status instead, so the
 * check itself stays reliable. (guidelines.md §11, §15)
 */
export const GET = withErrorHandling(async () => {
  let database: "connected" | "unconfigured" | "unreachable" = "unconfigured";

  if (isDatabaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "unreachable";
    }
  }

  return ok({
    status: "ok",
    service: "transitops",
    database,
    timestamp: new Date().toISOString(),
  });
});
