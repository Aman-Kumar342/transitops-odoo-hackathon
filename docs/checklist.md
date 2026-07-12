# TransitOps — Implementation Checklist (Living Tracker)

> **This is not documentation — it is the working tracker.** Update it *immediately*
> after finishing any task: tick the box, bump the percentages, add newly discovered
> tasks. Never let it go stale. Read `docs/problem.md` before starting any phase.
>
> **Rule references** (R1–R18), **section refs** (§n), and **assumptions** (🟨) point
> back to `docs/problem.md`.

---

# Overall Progress

- **Overall completion:** ~88% (Phases 0-9 done; Phase 10 hardening remains)
- **Current phase:** Phase 9 (bonus) done, next: Phase 10 (hardening & demo)
- **Completed:** Phases 0-8 - foundation, auth/RBAC, vehicles, drivers, trips (with
  transactional dispatch + race guard), maintenance, fuel/expense/operational-cost,
  dashboard KPIs, and reports/analytics (fuel efficiency, utilization, operational cost,
  ROI, CSV export). UI realigned to the design mockup. All verified against the live DB.
  **All 8 mandatory deliverables are now implemented.**
- **Remaining:** Phase 9 (bonus features), Phase 10 (hardening & demo)
- **Blocked:** none. DB is live on the user's VPS (isolated `transitops` DB) reached via
  SSH tunnel on local port 55432. Postgres localhost-bound; only the `transitops` role +
  `transitops`/`transitops_shadow` DBs are used — no other VPS project touched.
- **Stack (locked):** Next.js (App Router) + Prisma + local PostgreSQL. Thin route
  handlers → `lib/services/` (business rules R1–R18) → `lib/repositories/` (Prisma).
  No BaaS. Auth via JWT/session; CSV export server-side.
- **DB policy (locked):** Prisma Migrate is primary; use **raw SQL inside migrations**
  for anything Prisma can't express (CHECK, partial unique indexes, triggers, etc.).
  DB must reject invalid data even if the API is bypassed. Rules enforced at UI + API +
  Service + DB.
- **Architecture (locked):** Route Handler (orchestration only) → Service (single source
  of truth for business rules + status transitions + analytics) → Repository (DB ops
  only, no logic) → PostgreSQL. No business logic in routes/repositories; no rule
  duplication across layers.

### Tracked Engineering Assumptions (must stay traceable)
| ID | Assumption | Status | Where implemented |
|----|-----------|--------|-------------------|
| §18-F | ROI Revenue source → add nullable `trips.revenue`, captured on completion; Vehicle Revenue = Σ revenue of Completed trips; ROI = (Revenue − (Fuel + Maintenance)) / Acquisition Cost | ✅ Approved (Option A) | Phase 4 (schema) + Phase 8 (analytics) |
| §18-C | `region` added to vehicles (dashboard filter has no backing field) | ✅ Approved | Phase 2 |
| §18-D | Block opening maintenance on an On-Trip vehicle | ✅ Approved | Phase 5 |
| §18-E | Maintenance cost single source of truth = `maintenance_logs.cost` (no double-count) | ✅ Approved | Phase 6/8 |
| §18-H | License eligible iff `expiry >= today` (inclusive) | ✅ Approved | Phase 3/4 |
| §18-B | Keep Users/Drivers separate; optional nullable `drivers.user_id` | ✅ Approved | Phase 3 |
| §18-A | Both Driver and Fleet Manager may create/dispatch trips | ✅ Approved | Phase 4 |

### Phase progress
| Phase | Title | % | Status |
|------:|-------|--:|--------|
| 0 | Foundation | 100% | ✅ Done (DB live on VPS via tunnel) |
| 1 | Auth & RBAC & Users/Roles | 100% | ✅ Done (verified dev + prod) |
| 2 | Vehicle Registry | 100% | ✅ Done (CRUD + DB CHECKs + RBAC verified) |
| 3 | Driver Management | 100% | ✅ Done (CRUD + status machine + eligibility verified) |
| 4 | Trip Management + transitions | 100% | ✅ Done (transactional dispatch + race guard verified) |
| 5 | Maintenance workflow | 100% | ✅ Done (In-Shop/close workflow + 18-D verified) |
| 6 | Fuel & Expense | 100% | ✅ Done (CRUD + operational cost, no double count) |
| 7 | Dashboard KPIs | 100% | ✅ Done (7 KPIs + filters + recent trips + legend) |
| 8 | Reports & Analytics | 100% | ✅ Done (4 metrics + ROI + CSV export verified) |
| 9 | Bonus features | 80% | ✅ Dark mode + expiring-license reminders + charts (PDF/docs skipped) |
| 10 | Hardening & Demo | 0% | Not started |

### How to update this file
1. When you start a task, note it under "Current phase" (only one in progress).
2. When done, tick `[x]`, recompute the phase % = ticked/total in that phase.
3. Recompute Overall % = ticked/total across all phases.
4. Add any newly discovered task as a new unchecked box in the right phase.

---

## Phase 0 — Foundation

**Standard sub-tracks**
- [x] Database — Prisma tooling + datasource wired (client generates once models land in P1)
- [x] Backend — Next.js server, lazy Prisma singleton, error-handling wrapper
- [x] Validation — zod-based validation layer scaffolded (`lib/validation`)
- [x] APIs — `/api/health` live, returns consistent envelope
- [x] UI — theme tokens, root layout, home shell, shared state components
- [x] Testing — manual smoke test (build green; health/home/404 verified)
- [x] Edge Cases — health degrades gracefully when DB unconfigured/unreachable
- [x] Documentation — README run steps; layer READMEs; docs synced

**Detailed tasks**
- [x] Decide & record tech stack (§18-L) — **Next.js (App Router) + Prisma + PostgreSQL**
- [x] Scaffold Next.js App Router project (`app/`, `lib/services`, `lib/repositories`, `lib/validation`, `lib/http`, `components/ui`)
- [x] Prisma init + `schema.prisma` (datasource → PostgreSQL); models added per phase
- [ ] Set up local PostgreSQL instance (no BaaS) — **BLOCKED: no local Postgres running in env; provision before Phase 1 migrate** (see Blocked)
- [x] DB connection + pooling config via env vars (`DATABASE_URL`, lazy singleton `lib/db.ts`)
- [x] Migration tooling wired up (`prisma:migrate` / `prisma:generate` scripts)
- [x] `.env.example` + secrets kept out of git (`.gitignore` covers `.env*`)
- [x] Base API server + health endpoint (`/api/health` — app + DB reachability)
- [x] Global error-handling middleware + consistent error envelope (`lib/http/*`)
- [x] Request validation layer scaffolding (`lib/validation/index.ts`)
- [x] Frontend routing + layout shell + theme (nav shell + **auth guard → Phase 1** with auth)
- [x] Shared UI states: loading, empty, error (`components/ui/states.tsx`) — **toast → Phase 1** (needs client provider for mutations)
- [x] Consistent theme / color scheme tokens (`app/globals.css`, light + dark)
- [x] README run instructions (setup, migrate, seed, run)
- [x] Verify: `npm run build` green, `npm run typecheck` clean, dev server serves health/home
- [x] Security: patched Next to 14.2.35 (14.2.15 had an advisory)

---

## Phase 1 — Auth & RBAC & Users/Roles ✅

- [x] Database — `roles` + `users` migrated to the transitops DB
- [x] Backend — auth service/repository, JWT (jose), bcrypt hashing
- [x] Validation — zod login/change-password schemas (shared FE+BE)
- [x] APIs — login / logout / me / password, consistent envelope
- [x] UI — login, settings (change password), shell w/ logout, 403, 404
- [x] Testing — full auth flow smoke-tested in dev AND production build
- [x] Edge Cases — generic 401, inactive user, unauth redirect, wrong/weak password
- [x] Documentation — synced; NODE_ENV build trap recorded

**Roles & Users (DB)**
- [x] `roles` table + migration + model
- [x] `users` table + migration + model (FK role_id, unique email)
- [x] Audit fields on both (created_at/updated_at)
- [x] Seed 5 roles: Admin, Fleet Manager, Driver, Safety Officer, Financial Analyst
- [x] Seed initial admin user (creds in gitignored `.env`)

**Backend / Auth**
- [x] Password hashing (bcryptjs, 10 rounds)
- [x] `POST /api/auth/login` (email+password → httpOnly session cookie)
- [x] `POST /api/auth/logout`
- [x] `GET /api/auth/me`
- [x] `PUT /api/auth/password`
- [x] JWT/session issuance + verification (jose, HS256, httpOnly cookie)
- [x] RBAC policy encoded from §3 matrix (`lib/auth/rbac.ts`, deny-by-default) + guards
- [x] Protect all non-auth routes (global `middleware.ts`)

**Validation**
- [x] Email format validation (graceful field-level feedback)
- [x] Password strength/min length (≥8, letter+number)
- [x] Unique email enforcement (DB) + friendly error
- [x] Generic invalid-credentials error (no user enumeration, §16)

**UI**
- [x] Login page + inline validation
- [x] Session-expired handling → redirect to login (`apiFetch` 401 → /login)
- [x] 403 Unauthorized page (`/unauthorized`)
- [x] Logout control (app shell)
- [x] Change-password form (Settings)

**Edge cases (§15)**
- [x] Wrong password / unknown email → 401 generic (verified)
- [x] Inactive user blocked (same generic 401, no enumeration)
- [x] Invalid/expired/missing token → 401 (middleware + guards, verified)
- [ ] Cross-role access attempt → 403 (guard + rbac ready; exercised in Phase 2+ when
      role-restricted resource endpoints exist)

**Testing**
- [x] Login success/failure (verified dev + prod)
- [x] RBAC allow/deny helper (`can()`) — unit-level matrix in place
- [x] Token/session verify (invalid → 401 verified)

**Build note**
- [x] Root layout forces dynamic rendering (authenticated app; no static pages)
- [x] Fixed build trap: removed `NODE_ENV` from `.env` (it forced React dev bundles
      into `next build`, causing prerender crashes). Never pin NODE_ENV in `.env`.

---

## Phase 2 — Vehicle Registry (CRUD) ✅

- [x] Database — `vehicles` migrated with enum, indexes, CHECK constraints
- [x] Backend — vehicle service/repository, layered
- [x] Validation — zod schemas (FE+BE) + DB CHECK backstop
- [x] APIs — full CRUD + available pool + filters/search/sort/pagination
- [x] UI — list, form (create/edit), detail, retire dialog, all states
- [x] Testing — API smoke-tested (CRUD, rules, RBAC, DB backstop) + prod build
- [x] Edge Cases — dup reg no, odometer decrease, retire-on-trip, retired-edit
- [x] Documentation — synced

**Database / Model**
- [x] `vehicles` table + migration
- [x] Fields: reg no, name/model, type, max_load_capacity, odometer, acquisition_cost, status, region 🟨, retired_at, audit
- [x] UNIQUE(registration_number) + normalized-form CHECK (§18-J) — case/space-insensitive
- [x] CHECK capacity>0, odometer≥0, acquisition_cost≥0 (raw SQL in migration)
- [x] CHECK type ∈ allowed set (raw SQL) — DB enforces the closed set
- [x] Status enum VehicleStatus (Available/On Trip/In Shop/Retired)
- [x] Indexes: status, type, region, registration_number
- [x] Model (Prisma)

**Validation**
- [x] Unique reg no (R1) — async FE check + BE re-check + DB unique (all verified)
- [x] Reg-no trim+collapse+uppercase normalization (§18-J) — verified via " mh-12.. "→"MH-12.."
- [x] Numeric ranges (R14) — zod + DB CHECK
- [x] Odometer monotonic non-decreasing on update (R11) — verified 422
- [x] Status: create→Available; only retire changes it here (trips/maintenance in P4/P5)

**APIs**
- [x] `GET /vehicles` (list)
- [x] `POST /vehicles` (create)
- [x] `GET /vehicles/:id` (detail)
- [x] `PUT /vehicles/:id` (update)
- [x] `DELETE /vehicles/:id` (soft delete = Retire)
- [x] `GET /vehicles/available` (dispatch pool, status=Available) — verified 0 after retire
- [ ] `GET /vehicles/:id/operational-cost` — **deferred to Phase 6** (needs fuel+maintenance data)
- [x] Search (reg no + name, case-insensitive)
- [x] Filters (type/status/region)
- [x] Sorting (whitelisted fields via API)
- [x] Pagination
- [x] Duplicate-reg-no validation → 409 (verified, incl. case/space variant)
- [x] RBAC on every endpoint (verified: Driver 403 create/delete, 200 read; FM 201 create)

**UI**
- [x] Vehicle list table
- [x] Search + status/type filters (sort exposed via API; header-sort UI optional/later)
- [x] Create form (inline validation + async reg-no uniqueness check)
- [x] Edit form
- [x] Vehicle detail (info card; history tabs arrive with trips/maintenance/fuel)
- [x] Retire confirm dialog (inline, guarded when On-Trip)
- [x] Empty state
- [x] Loading state
- [x] Error state

**Edge cases (§15)**
- [x] Duplicate reg no (case/whitespace) rejected — verified 409
- [x] Retire an On-Trip vehicle blocked (§7.1) — guard in service + UI disabled
- [x] Decreasing odometer rejected (R11) — verified 422
- [x] DB CHECK backstop: direct invalid SQL insert rejected (regno/capacity/type) — verified

**Testing**
- [x] CRUD smoke tests (create/read/update/retire) — verified
- [x] Uniqueness (case/space) integration test — verified
- [x] Available-pool filter test — verified
- [x] Cross-role RBAC test (Driver vs Fleet Manager) — verified
- [ ] Automated unit/integration test suite — deferred (manual verification done; add
      a test runner in a later hardening pass)

---

## Phase 3 — Driver Management (CRUD) ✅

- [x] Database — `drivers` migrated with enum, indexes, CHECK constraints, soft delete
- [x] Backend — driver service/repository, layered
- [x] Validation — zod schemas (FE+BE) + DB CHECK backstop
- [x] APIs — full CRUD + available pool + status actions + filters/search/pagination
- [x] UI — list w/ license badges, form, detail w/ lifecycle actions, all states
- [x] Testing — API smoke-tested (CRUD, eligibility, status machine, RBAC, DB backstop)
- [x] Edge Cases — expires-today, suspended-ineligible, out-of-range, dup license, on-trip
- [x] Documentation — synced

**Database / Model**
- [x] `drivers` table + migration
- [x] Fields: name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, user_id 🟨, deleted_at, audit
- [x] UNIQUE(license_number) + normalized-form CHECK 🟨 (case/space-insensitive)
- [x] CHECK safety_score 0-100 (raw SQL)
- [x] CHECK license_category in allowed set + contact non-empty (raw SQL)
- [x] Status enum DriverStatus (Available/On Trip/Off Duty/Suspended)
- [x] Indexes: status, license_expiry_date, license_number
- [x] Model (Prisma) + optional User.driver 1:1 link (§18-B)

**Validation**
- [x] Valid license expiry date (YYYY-MM-DD)
- [x] Contact number format (lenient phone regex + DB non-empty)
- [x] Safety score 0-100 (R14) - zod + DB CHECK
- [x] Unique license number (R17 🟨) - verified case-insensitive 409
- [x] Status transition validation (§7.2) - central transition map in service

**APIs**
- [x] `GET /drivers` (list)
- [x] `POST /drivers` (create)
- [x] `GET /drivers/:id` (detail)
- [x] `PUT /drivers/:id` (update)
- [x] `DELETE /drivers/:id` (soft delete/deactivate) - verified 204 then 404
- [x] `GET /drivers/available` (eligible: Available & !expired & !deleted, R3) - verified
- [x] `POST /drivers/:id/suspend`
- [x] `POST /drivers/:id/reinstate` (only from Suspended - verified 422 otherwise)
- [x] `POST /drivers/:id/duty` (Available <-> Off Duty clock in/out, §7.2)
- [x] Search / filters (status/category/eligible) / sort / pagination
- [x] RBAC verified: Safety Officer create 201; Driver 403; Fleet Manager 403

**UI**
- [x] Driver list table + license badge (expired/valid)
- [x] Search + status/category/eligible filters
- [x] Create / Edit forms (async license uniqueness check)
- [x] Driver detail (trip history arrives with Phase 4)
- [x] Suspend / Reinstate / Duty / Deactivate actions (with confirm)
- [x] Empty / loading / error states

**Edge cases (§15)**
- [x] License expires today → eligible (inclusive, §18-H) - verified
- [x] Suspended driver ineligible (R3) - verified excluded from pool
- [x] Safety score out of range rejected (API 400 + DB CHECK) - verified
- [x] Duplicate license (case/space) rejected - verified 409
- [x] Suspend an On-Trip driver blocked (§7.2) - guard in service (exercised once trips exist)

**Testing**
- [x] CRUD smoke tests - verified
- [x] Eligibility filter tests (expired/suspended excluded from available pool) - verified
- [x] DB CHECK backstop (safety range / category / normalized license) - verified
- [ ] Automated unit/integration suite - deferred (manual verification done)

---

## Phase 4 — Trip Management + Automatic Status Transitions ✅

- [x] Database — `trips` migrated with enum, FKs, partial-unique race guard, CHECKs
- [x] Backend — trip service/repository with transactional actions
- [x] Validation — zod schemas (create/update/complete/list) + DB CHECK backstop
- [x] APIs — list/create/detail/edit + dispatch/complete/cancel, RBAC-gated
- [x] UI — list w/ status tabs, create w/ eligible pickers + live capacity, detail w/ actions
- [x] Testing — full workflow, side effects, R11, terminal guards, concurrency race verified
- [x] Edge Cases — capacity boundary, terminal states, concurrent double-dispatch
- [x] Documentation — synced

**Database / Model**
- [x] `trips` table + migration
- [x] Fields: source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, start_odometer 🟨, final_odometer, fuel_consumed 🟦, **revenue (nullable) ✅ §18-F**, dispatched_at, completed_at, cancelled_at, created_by, audit
- [x] `trips.revenue` NUMERIC NULL column (§18-F) - verified captured (12000) on completion
- [x] Capture `revenue` on trip completion (completion form + `/trips/:id/complete`)
- [x] FKs RESTRICT to vehicles/drivers
- [x] CHECK cargo_weight>0, planned_distance>=0, final>=start, fuel>0, revenue>=0 (raw SQL)
- [x] Status enum TripStatus (Draft/Dispatched/Completed/Cancelled)
- [x] Partial unique: one Dispatched trip per vehicle (R4) - raw SQL
- [x] Partial unique: one Dispatched trip per driver (R4) - raw SQL
- [x] Indexes: status, vehicle_id, driver_id, created_at

**Validation / Rules**
- [x] Eligible vehicle only (R2) - BE re-check at dispatch (verified)
- [x] Eligible driver only (R3) - BE re-check at dispatch
- [x] No double assignment (R4) - verified via concurrent race (one wins)
- [x] Cargo <= capacity (R5), boundary equal allowed - verified 450<=500 ok, 501 rejected
- [x] Valid transitions only (§7.3) - terminal-state guards verified
- [x] Final odometer >= start (R11) on completion - verified 900<1000 rejected
- [x] Fuel consumed captured on completion (§18-G)
- [x] Revenue captured on completion (§18-F) - feeds ROI (Phase 8)

**APIs**
- [x] `GET /trips` (list by status)
- [x] `POST /trips` (create Draft)
- [x] `GET /trips/:id`
- [x] `PUT /trips/:id` (edit Draft only)
- [x] `POST /trips/:id/dispatch` (txn + row lock, R6)
- [x] `POST /trips/:id/complete` (txn, R7)
- [x] `POST /trips/:id/cancel` (txn, R8)
- [x] Filters / search / pagination

**Transactions (critical)**
- [x] Dispatch txn: trip→Dispatched, vehicle→On Trip, driver→On Trip (atomic) - verified
- [x] Complete txn: trip→Completed + odometer/fuel/revenue, both→Available - verified
- [x] Cancel-dispatched txn: restore vehicle+driver→Available - verified
- [x] Cancel-draft: mark Cancelled (no side effects)
- [x] Row locking (SELECT FOR UPDATE) on trip+vehicle+driver during transitions (race guard)

**UI**
- [x] Trip list with status tabs/filter + search
- [x] Create trip form: source/dest/cargo/distance
- [x] Eligible-only vehicle picker (from /vehicles/available)
- [x] Eligible-only driver picker (from /drivers/available)
- [x] Live cargo <= capacity check
- [x] Trip detail + status timeline
- [x] Dispatch action + confirm dialog
- [x] Complete form (final odometer + fuel + revenue §18-F)
- [x] Cancel action + confirm dialog
- [x] Draft-only edit form; Empty / loading / error states

**Edge cases (§15)**
- [x] Two concurrent dispatches same vehicle+driver → exactly one wins (verified 200/422)
- [x] Dispatch Draft whose vehicle is no longer available → rejected (R2 re-check)
- [x] Complete an already-Completed trip → rejected (verified)
- [x] Cancel a Completed trip → rejected (verified)
- [x] Cargo == capacity allowed; cargo>capacity rejected (verified)
- [x] Transactional integrity - no partial state (atomic side effects verified)

**Testing**
- [x] Transition tests (valid + invalid/terminal edges) - verified
- [x] Concurrency/race integration test - verified (parallel dispatch, one wins)
- [x] Capacity + eligibility integration tests - verified
- [ ] Automated suite - deferred (manual verification thorough)

---

## Phase 5 — Maintenance Workflow ✅

- [x] Database — `maintenance_logs` migrated with enum, partial unique, cost CHECK
- [x] Backend — maintenance service/repository with transactional open/close
- [x] Validation — zod schemas (create/update/list) + DB CHECK backstop
- [x] APIs — list/create(open)/detail/edit/close, RBAC-gated
- [x] UI — list, create (Available-only picker), detail, close dialog, edit
- [x] Testing — open/close side effects, 18-D, R10 retired, one-open, DB backstop verified
- [x] Edge Cases — covered
- [x] Documentation — synced

- [x] `maintenance_logs` table + migration (vehicle_id, type, description, cost, status, odometer_at_service 🟨, opened_at, closed_at, audit)
- [x] CHECK cost>=0 (raw SQL); status enum MaintenanceStatus Open/Closed
- [x] Partial unique: one Open record per vehicle (raw SQL) - verified via DB backstop
- [x] Index vehicle_id, status
- [x] `GET /maintenance` (list)
- [x] `POST /maintenance` (create -> txn: Open + vehicle->In Shop, R9) - verified
- [x] `GET /maintenance/:id`
- [x] `PUT /maintenance/:id`
- [x] `POST /maintenance/:id/close` (txn: vehicle->Available unless Retired, R10) - verified
- [x] Block opening maintenance on an On-Trip vehicle (§18-D) - verified 422
- [x] Vehicle removed from dispatch pool when In Shop (R2) - verified
- [x] UI: maintenance list
- [x] UI: create form (Available-only vehicle picker; On-Trip/In-Shop/Retired excluded)
- [x] UI: maintenance detail
- [x] UI: close dialog (confirmation)
- [x] Empty / loading / error states
- [x] Edge: two Open records blocked (app 422 + DB partial-unique) - verified
- [x] Edge: close for Retired vehicle stays Retired (R10) - verified
- [x] Edge: transactional open/close (atomic record + vehicle status)
- [x] Tests: open/close transitions + status side effects - verified
- [x] RBAC verified: Fleet Manager/Financial read 200; Driver read 403

---

## Phase 6 — Fuel & Expense Management ✅

- [x] Database — fuel_logs + expenses migrated with CHECKs, enum, indexes
- [x] Backend — fuel/expense services + cost aggregation service
- [x] Validation — zod schemas (liters>0, cost/amount>=0, no future date) + DB CHECK
- [x] APIs — fuel-logs + expenses CRUD + operational-cost, RBAC-gated
- [x] UI — fuel & expense pages (inline add/edit/delete) + cost card on vehicle detail
- [x] Testing — CRUD, validation, aggregation, RBAC, DB backstop verified
- [x] Edge Cases — zero liters, future date, no double count
- [x] Documentation — synced

**Fuel logs**
- [x] `fuel_logs` table + migration (vehicle_id, trip_id?, liters, cost, date, odometer 🟨, notes, audit)
- [x] CHECK liters>0, cost>=0 (raw SQL)
- [x] Index vehicle_id, date, trip_id
- [x] `GET/POST /fuel-logs`, `GET/PUT/DELETE /fuel-logs/:id`
- [x] Validation: liters>0, cost>=0, date not in future 🟨 - verified
- [x] UI: fuel list + inline add/edit form + delete

**Expenses**
- [x] `expenses` table + migration (vehicle_id, trip_id?, category, amount, date, description, audit)
- [x] CHECK amount>=0 (raw SQL); category ExpenseCategory enum (Toll/Parking/Insurance/Fine/Misc)
- [x] Index vehicle_id, category, date
- [x] `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`
- [x] Validation: amount>=0, date not in future 🟨, category in enum
- [x] UI: expense list + inline add/edit form + delete
- [x] Note (§18-E): Fuel/Maintenance are NOT expense categories - they have dedicated
      tables (single source of truth), so expenses never double-count into operational cost

**Operational cost**
- [x] Auto-compute total operational cost = Fuel + Maintenance per vehicle (§14) - verified 10000
- [x] `GET /vehicles/:id/operational-cost` (SQL SUM aggregates, no app loops)
- [x] Avoid double-counting maintenance (§18-E) - expenses reported separately, verified
- [x] Per-vehicle cost summary UI (card on vehicle detail)

**Edge cases / tests**
- [x] Zero/negative liters rejected (API 400 + DB CHECK) - verified
- [x] Future-dated fuel/expense rejected 🟨 - verified 400
- [x] Aggregation correctness - verified (fuel 7500 + maint 2500 = 10000, expenses 350 separate)
- [x] RBAC verified: Driver fuel create-only; Financial full; Safety none; DB backstop

---

## Phase 7 — Dashboard KPIs ✅

- [x] Database — reuses vehicle/driver/trip counts (no new tables)
- [x] Backend — dashboard service (SQL COUNT aggregates)
- [x] Validation — dashboard filter schema (type/status/region)
- [x] APIs — GET /api/dashboard/kpis, RBAC-gated
- [x] UI — 7 KPI tiles + filters + Recent Trips + Vehicle Status legend
- [x] Testing — KPI formulas + filters verified against live data
- [x] Edge Cases — divide-by-zero guard on utilization
- [x] Documentation — synced

- [x] `GET /dashboard/kpis?type=&status=&region=` - verified
- [x] Active Vehicles (On Trip)
- [x] Available Vehicles
- [x] Vehicles in Maintenance (In Shop)
- [x] Active Trips (Dispatched)
- [x] Pending Trips (Draft)
- [x] Drivers On Duty (§13 🟨: On Trip OR Available, single query)
- [x] Fleet Utilization % with divide-by-zero guard - verified (25% = 1/4)
- [x] Filters: vehicle type / status / region (region options from live data)
- [x] Single/few-query aggregation via Promise.all COUNTs (no N+1, §17)
- [x] UI: 7 KPI tiles + Fleet Utilization tile with progress bar
- [x] UI: filter bar (type/status/region)
- [x] Refresh on load + on filter change (real-time reads, §18-K)
- [x] Mockup extras: Recent Trips table (latest 8) + Vehicle Status legend with counts
- [x] Empty (zero fleet) → all 0, no NaN (guarded)
- [x] Loading + error states
- [x] Tests: KPI formulas verified (utilization, filters, status breakdown)

---

## Phase 8 — Reports & Analytics ✅

- [x] Database — reuses fuel/maintenance/trip/vehicle aggregates (no new tables)
- [x] Backend — analytics service (groupBy aggregates, no N+1)
- [x] Validation — n/a (read-only report)
- [x] APIs — GET /api/analytics + /api/analytics/export (CSV), RBAC-gated
- [x] UI — analytics page: KPI cards, ROI formula, monthly revenue chart, top costliest, per-vehicle table
- [x] Testing — all four formulas + CSV export verified against live data
- [x] Edge Cases — divide-by-zero → N/A
- [x] Documentation — synced

- [x] Resolve Revenue field for ROI (§18-F) — decided + implemented: trips.revenue captured on complete
- [x] Fuel Efficiency = Distance/Fuel (§14) + N/A guard when fuel=0 — verified 1.76 km/l, N/A for no-fuel
- [x] Fleet Utilization report — verified 25%
- [x] Operational Cost report (Fuel+Maintenance, no double count, §18-E) — verified 12600
- [x] Vehicle ROI = (Revenue−(Maintenance+Fuel))/Acquisition Cost + N/A when cost=0 — verified per vehicle
- [x] Consolidated into `GET /api/analytics` (summary + per-vehicle: fuel efficiency,
      utilization, operational cost, ROI) — one report endpoint vs four separate; same data
- [x] `GET /api/analytics/export?format=csv` (mandatory CSV) — verified headers + attachment
- [x] SQL-aggregate computation via groupBy + count merged app-side (no N+1, §17)
- [x] UI: analytics page (KPI cards + per-vehicle table + monthly revenue chart + top costliest)
- [x] UI: export CSV button
- [ ] Date-range filter — deferred (report is all-time; add a range picker in a later pass)
- [x] Edge: no-data → N/A (guarded), CSV always includes the header row
- [x] Tests: each formula incl. divide-by-zero — verified
- [x] Mockup screen 7 matched: Export CSV, 4 KPI cards, ROI formula, Monthly Revenue, Top Costliest Vehicles
- [ ] PDF export — bonus, not implemented (CSV is the mandatory export)

---

## Phase 9 — Bonus Features (time permitting)

- [x] Charts & visual analytics — monthly revenue bar chart + fleet-utilization bar
      (Phase 7/8); status legend
- [ ] PDF export — not implemented (CSV is the mandatory export; PDF is bonus)
- [x] Expiring-license reminders — in-app: `GET /api/drivers/expiring-licenses?days=30`
      + alert banner on Drivers page (no external email dependency; SMTP avoided per
      the "minimal third-party" guidance) - verified
- [ ] Vehicle document management — not implemented (needs file storage; out of scope)
- [x] Advanced search / filters / sorting — search + filters across vehicles/drivers/
      trips/maintenance; sortable API fields; dashboard/analytics filters
- [x] Dark mode toggle — top-bar toggle, persisted to localStorage, no-flash script - verified

**Delivered bonus:** dark mode, in-app expiring-license reminders, charts, and
cross-module search/filters. Not done (documented): PDF export, vehicle document
management - both lower value than the hardening pass and either need a heavy dep
(PDF) or file storage (documents).

---

## Phase 10 — Hardening & Demo

- [ ] Security pass (§16): hashing, RBAC server-side, param queries, mass-assignment whitelist, secrets in env
- [ ] Broken-access-control test across every role/route
- [ ] Performance/index pass (§17): all FKs + filter columns indexed, pagination everywhere
- [ ] Run all §15 edge-case tests
- [ ] Seed realistic demo data
- [ ] Rehearse the §5 example workflow end-to-end (Van-05 / Alex / 450kg)
- [ ] Verify CSV export
- [ ] Responsive check across screen sizes
- [ ] Consistent theme/navigation audit
- [ ] Confirm real-time/dynamic data (no static JSON in prod paths)
- [ ] Git: confirm every team member has meaningful commits
- [ ] Presentation prep (shared ownership)

---

## Newly Discovered Tasks (append as found)
- [x] ~~Provision local PostgreSQL~~ — resolved: isolated `transitops` DB on the VPS via
      SSH tunnel (55432). Migrations run.
- [x] ~~Auth-guarded layout + nav shell~~ — done in Phase 1 (`components/app-shell.tsx`,
      global `middleware.ts`).
- [x] ~~Add `prisma/seed.ts`~~ — done (roles + admin).
- [ ] **Toast/notification provider** (global) — still deferred; Phase 1 uses inline
      form feedback. Add a global toast when broader CRUD lands (Phase 2+).
- [ ] **Deactivated-user login** path is covered by the generic 401, but add an explicit
      admin UI to deactivate users when user-management UI is built (Admin, later phase).
- [ ] **Cross-role 403** end-to-end test — wire once role-restricted resource endpoints
      exist (Phase 2: e.g., Driver cannot POST /vehicles).
- [ ] Revisit remaining `npm audit` items later (fix requires Next 16 major bump —
      deferred to avoid breaking the React 18 setup).
- [x] ~~DB seed of demo users per role~~ — done (fleet/driver/safety/finance demo users,
      `DEMO_PASSWORD` in `.env`); used to verify cross-role 403.

### ⚠️ Build/ops lessons (do not repeat)
- **Never set `NODE_ENV` in `.env`.** It leaks into `next build` and forces React's dev
  bundles into a production build → prerender crashes (`useContext` null, `<Html>`
  import errors). Let Node/Next set it per command.
- **Sandbox already runs a Postgres on `0.0.0.0:5432`** — the VPS tunnel therefore uses
  local port **55432**. Keep the tunnel alive during DB work; `.env` points at 55432.

---

*Keep this file honest. A green checkbox must mean the task is truly done and, where
applicable, tested.*
