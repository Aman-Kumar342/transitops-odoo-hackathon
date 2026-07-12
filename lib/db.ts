import { PrismaClient } from "@prisma/client";

/**
 * Lazy Prisma client singleton.
 *
 * The client is constructed on FIRST USE, not at import time. This matters because:
 *  - `next build` imports route modules to collect page data; constructing a DB client
 *    at import time would couple the build to a generated client / live database.
 *  - In dev, Next.js hot-reload would otherwise create a new client on every reload and
 *    exhaust the connection pool — so we cache one instance on `globalThis`.
 *
 * This is the ONLY module that instantiates a database client. All DB access flows
 * through the repository layer (lib/repositories), which imports `prisma` from here.
 * (guidelines.md §9 — repositories are the only code that touches the DB.)
 *
 * NOTE: The Prisma client is only generated once models exist (Phase 1 adds Role/User).
 * Until then, accessing `prisma` at runtime will throw — Phase 0 never does, because it
 * only touches the DB when DATABASE_URL is configured and models exist.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
