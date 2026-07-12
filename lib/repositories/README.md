# Repository Layer

**Database access only.** (see `docs/guidelines.md` §9)

Rules:
- Repositories perform **only** Prisma/DB operations. **No business logic** — no rule
  checks, no status-transition decisions, no analytics math.
- They import the shared client from `lib/db.ts` (the only PrismaClient instance).
- They expose narrow, intention-revealing functions (e.g. `findAvailableVehicles`),
  not a leaky generic query interface.
- Transactions that span multiple repositories are orchestrated by the **service**
  layer (passing a Prisma transaction client down), so atomicity stays a service
  concern while the SQL stays here.

Files are added per phase, mirroring the services that consume them.
