# Service Layer

**Single source of truth for all business rules.** (see `docs/guidelines.md` §9)

Rules:
- Business rules (R1–R18 in `docs/problem.md` §5) live **here** and nowhere else.
- All **status transitions** (§7 state machines) happen through services, inside DB
  transactions where multiple rows change atomically (R6–R10).
- All **analytics calculations** (§14) live here — never in the UI or repositories.
- Services call the **repository layer** for data access; they never touch Prisma
  directly.
- No business logic is duplicated across layers.

Files are added per phase:
- Phase 1 → `auth.service.ts`
- Phase 2 → `vehicle.service.ts`
- Phase 3 → `driver.service.ts`
- Phase 4 → `trip.service.ts` (dispatch/complete/cancel transactions)
- Phase 5 → `maintenance.service.ts`
- Phase 6 → `fuel.service.ts`, `expense.service.ts`
- Phase 7 → `dashboard.service.ts`
- Phase 8 → `analytics.service.ts`
