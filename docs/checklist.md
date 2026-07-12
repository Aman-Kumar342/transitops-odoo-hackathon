# TransitOps — Implementation Checklist (Living Tracker)

> **This is not documentation — it is the working tracker.** Update it *immediately*
> after finishing any task: tick the box, bump the percentages, add newly discovered
> tasks. Never let it go stale. Read `docs/problem.md` before starting any phase.
>
> **Rule references** (R1–R18), **section refs** (§n), and **assumptions** (🟨) point
> back to `docs/problem.md`.

---

# Overall Progress

- **Overall completion:** 0%
- **Current phase:** Phase 0 — Foundation
- **Completed:** none
- **Remaining:** Phases 0–10
- **Blocked:** none
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
| 0 | Foundation | 0% | Not started |
| 1 | Auth & RBAC & Users/Roles | 0% | Not started |
| 2 | Vehicle Registry | 0% | Not started |
| 3 | Driver Management | 0% | Not started |
| 4 | Trip Management + transitions | 0% | Not started |
| 5 | Maintenance workflow | 0% | Not started |
| 6 | Fuel & Expense | 0% | Not started |
| 7 | Dashboard KPIs | 0% | Not started |
| 8 | Reports & Analytics | 0% | Not started |
| 9 | Bonus features | 0% | Not started |
| 10 | Hardening & Demo | 0% | Not started |

### How to update this file
1. When you start a task, note it under "Current phase" (only one in progress).
2. When done, tick `[x]`, recompute the phase % = ticked/total in that phase.
3. Recompute Overall % = ticked/total across all phases.
4. Add any newly discovered task as a new unchecked box in the right phase.

---

## Phase 0 — Foundation

**Standard sub-tracks**
- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Detailed tasks**
- [x] Decide & record tech stack (§18-L) — **Next.js (App Router) + Prisma + PostgreSQL**
- [ ] Scaffold Next.js App Router project (`app/`, `lib/services`, `lib/repositories`)
- [ ] Prisma init + `schema.prisma` + connect to local PostgreSQL
- [ ] Set up local PostgreSQL/MySQL (no BaaS — hackathon rule)
- [ ] DB connection + pooling config via env vars
- [ ] Migration tooling wired up
- [ ] `.env.example` + secrets kept out of git (verify `.gitignore`)
- [ ] Base API server + health endpoint
- [ ] Global error-handling middleware + consistent error envelope
- [ ] Request validation layer scaffolding
- [ ] Frontend routing + auth-guarded layout + nav shell
- [ ] Shared UI states: loading skeleton, empty, error, toast components
- [ ] Consistent theme / color scheme tokens
- [ ] README run instructions (setup, migrate, seed, run)

---

## Phase 1 — Auth & RBAC & Users/Roles

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Roles & Users (DB)**
- [ ] `roles` table + migration + model
- [ ] `users` table + migration + model (FK role_id, unique email)
- [ ] Audit fields on both
- [ ] Seed 5 roles: Admin, Fleet Manager, Driver, Safety Officer, Financial Analyst
- [ ] Seed initial admin user

**Backend / Auth**
- [ ] Password hashing (bcrypt/argon2)
- [ ] `POST /auth/login` (email+password)
- [ ] `POST /auth/logout`
- [ ] `GET /auth/me`
- [ ] `PUT /auth/password`
- [ ] JWT/session issuance + verification
- [ ] RBAC middleware (deny-by-default, per §3 matrix)
- [ ] Protect all non-auth routes

**Validation**
- [ ] Email format validation (graceful feedback — criterion)
- [ ] Password strength/min length
- [ ] Unique email enforcement + friendly error
- [ ] Generic invalid-credentials error (no user enumeration, §16)

**UI**
- [ ] Login page + inline validation
- [ ] Session-expired handling → redirect to login
- [ ] 403 Unauthorized page
- [ ] Logout control
- [ ] Change-password form (Settings)

**Edge cases (§15)**
- [ ] Wrong password / unknown email → 401 generic
- [ ] Deactivated user blocked
- [ ] Expired token → 401
- [ ] Cross-role access attempt → 403

**Testing**
- [ ] Login success/failure
- [ ] RBAC allow/deny per role
- [ ] Token expiry

---

## Phase 2 — Vehicle Registry (CRUD)

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Database / Model**
- [ ] `vehicles` table + migration
- [ ] Fields: reg no, name/model, type, max_load_capacity, odometer, acquisition_cost, status, region 🟨, retired_at, audit
- [ ] UNIQUE(registration_number) normalized (§18-J)
- [ ] CHECK capacity>0, odometer≥0, acquisition_cost≥0
- [ ] Status enum (Available/On Trip/In Shop/Retired)
- [ ] Indexes: status, type, region, registration_number
- [ ] Model

**Validation**
- [ ] Unique reg no (R1) — async FE check + BE + DB
- [ ] Reg-no trim+uppercase normalization (§18-J)
- [ ] Numeric ranges (R14)
- [ ] Odometer monotonic non-decreasing on update (R11)
- [ ] Status transition validation (§7.1)

**APIs**
- [ ] `GET /vehicles` (list)
- [ ] `POST /vehicles` (create)
- [ ] `GET /vehicles/:id` (detail)
- [ ] `PUT /vehicles/:id` (update)
- [ ] `DELETE /vehicles/:id` (soft delete = Retire)
- [ ] `GET /vehicles/available` (dispatch pool, status=Available)
- [ ] `GET /vehicles/:id/operational-cost`
- [ ] Search
- [ ] Filters (type/status/region)
- [ ] Sorting (whitelisted)
- [ ] Pagination
- [ ] Duplicate-reg-no validation → 409

**UI**
- [ ] Vehicle list table
- [ ] Search + filters + sort controls
- [ ] Create form (inline + async validation)
- [ ] Edit form
- [ ] Vehicle detail (history tabs)
- [ ] Retire confirm dialog
- [ ] Empty state
- [ ] Loading state
- [ ] Error state

**Edge cases (§15)**
- [ ] Duplicate reg no (case/whitespace) rejected
- [ ] Retire an On-Trip vehicle blocked (§7.1)
- [ ] Decreasing odometer rejected

**Testing**
- [ ] CRUD unit tests
- [ ] Uniqueness integration test
- [ ] Available-pool filter test

---

## Phase 3 — Driver Management (CRUD)

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Database / Model**
- [ ] `drivers` table + migration
- [ ] Fields: name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, user_id 🟨, audit
- [ ] UNIQUE(license_number) 🟨
- [ ] CHECK safety_score 0–100
- [ ] Status enum (Available/On Trip/Off Duty/Suspended)
- [ ] Indexes: status, license_expiry_date, license_number
- [ ] Model

**Validation**
- [ ] Valid license expiry date
- [ ] Contact number format
- [ ] Safety score 0–100 (R14)
- [ ] Unique license number (R17 🟨)
- [ ] Status transition validation (§7.2)

**APIs**
- [ ] `GET /drivers` (list)
- [ ] `POST /drivers` (create)
- [ ] `GET /drivers/:id` (detail)
- [ ] `PUT /drivers/:id` (update)
- [ ] `DELETE /drivers/:id` (soft delete/deactivate)
- [ ] `GET /drivers/available` (eligible: Available & !expired & !Suspended)
- [ ] `POST /drivers/:id/suspend`
- [ ] `POST /drivers/:id/reinstate`
- [ ] Search / filters / sort / pagination

**UI**
- [ ] Driver list table + license badge
- [ ] Search + filters
- [ ] Create / Edit forms
- [ ] Driver detail + trip history
- [ ] Suspend / Reinstate dialogs
- [ ] Empty / loading / error states

**Edge cases (§15)**
- [ ] License expires today → eligible (inclusive, §18-H)
- [ ] Suspended driver ineligible (R3)
- [ ] Safety score out of range rejected
- [ ] Duplicate license rejected
- [ ] Suspend an On-Trip driver blocked (§7.2)

**Testing**
- [ ] CRUD tests
- [ ] Eligibility filter tests (expired/suspended/on-trip excluded)

---

## Phase 4 — Trip Management + Automatic Status Transitions

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Database / Model**
- [ ] `trips` table + migration
- [ ] Fields: source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, start_odometer 🟨, final_odometer, fuel_consumed 🟦, **revenue (nullable) ✅ §18-F**, dispatched_at, completed_at, cancelled_at, created_by, audit
- [ ] `trips.revenue` NUMERIC NULL column (§18-F approved assumption)
- [ ] Capture `revenue` on trip completion (completion form + `/trips/:id/complete`)
- [ ] FKs RESTRICT to vehicles/drivers
- [ ] CHECK cargo_weight>0, planned_distance≥0
- [ ] Status enum (Draft/Dispatched/Completed/Cancelled)
- [ ] Partial unique: one Dispatched trip per vehicle (R4)
- [ ] Partial unique: one Dispatched trip per driver (R4)
- [ ] Indexes: status, vehicle_id, driver_id, created_at

**Validation / Rules**
- [ ] Eligible vehicle only (R2) — BE re-check at dispatch
- [ ] Eligible driver only (R3) — BE re-check at dispatch
- [ ] No double assignment (R4)
- [ ] Cargo ≤ capacity (R5), boundary equal allowed
- [ ] Valid transitions only (§7.3, R18)
- [ ] Final odometer ≥ start (R11) on completion
- [ ] Fuel consumed captured on completion (§18-G)
- [ ] Revenue captured on completion (§18-F) — feeds ROI

**APIs**
- [ ] `GET /trips` (list by status)
- [ ] `POST /trips` (create Draft)
- [ ] `GET /trips/:id`
- [ ] `PUT /trips/:id` (edit Draft only)
- [ ] `POST /trips/:id/dispatch` (txn + row lock, R6)
- [ ] `POST /trips/:id/complete` (txn, R7)
- [ ] `POST /trips/:id/cancel` (txn, R8)
- [ ] Filters / pagination

**Transactions (critical)**
- [ ] Dispatch txn: trip→Dispatched, vehicle→On Trip, driver→On Trip (atomic)
- [ ] Complete txn: trip→Completed + odometer/fuel, vehicle→Available, driver→Available
- [ ] Cancel-dispatched txn: restore vehicle+driver→Available
- [ ] Cancel-draft: mark Cancelled (no side effects)
- [ ] Row locking on vehicle+driver during dispatch (race guard)

**UI**
- [ ] Trip list with status tabs/filter
- [ ] Create trip form: source/dest/cargo/distance
- [ ] Eligible-only vehicle picker (from /vehicles/available)
- [ ] Eligible-only driver picker
- [ ] Live cargo ≤ capacity check
- [ ] Trip detail + status timeline
- [ ] Dispatch action + confirm dialog
- [ ] Complete form (final odometer + fuel + revenue §18-F)
- [ ] Cancel action + confirm dialog
- [ ] Empty / loading / error states

**Edge cases (§15)**
- [ ] Two users dispatch same vehicle → one wins (409)
- [ ] Two users dispatch same driver → one wins
- [ ] Dispatch Draft whose vehicle got retired → rejected (R13)
- [ ] Complete an already-Completed trip → rejected
- [ ] Cancel a Completed trip → rejected
- [ ] Cargo == capacity allowed; cargo>capacity rejected
- [ ] Partial-failure rollback verified (R6)

**Testing**
- [ ] Transition unit tests (all valid + invalid edges)
- [ ] Concurrency/race integration test
- [ ] Capacity + eligibility integration tests

---

## Phase 5 — Maintenance Workflow

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

- [ ] `maintenance_logs` table + migration (vehicle_id, type, description, cost, status, odometer_at_service 🟨, opened_at, closed_at, audit)
- [ ] CHECK cost≥0; status enum Open/Closed
- [ ] Partial unique: one Open record per vehicle
- [ ] Index vehicle_id, status
- [ ] `GET /maintenance` (list)
- [ ] `POST /maintenance` (create → txn: Open + vehicle→In Shop, R9)
- [ ] `GET /maintenance/:id`
- [ ] `PUT /maintenance/:id`
- [ ] `POST /maintenance/:id/close` (txn: vehicle→Available unless Retired, R10)
- [ ] Block opening maintenance on an On-Trip vehicle (§18-D)
- [ ] Vehicle removed from dispatch pool when In Shop (R2)
- [ ] UI: maintenance list
- [ ] UI: create form (vehicle picker excludes On-Trip)
- [ ] UI: maintenance detail
- [ ] UI: close dialog
- [ ] Empty / loading / error states
- [ ] Edge: two Open records blocked
- [ ] Edge: close for Retired vehicle stays Retired (R10)
- [ ] Edge: transactional rollback on failure (R9)
- [ ] Tests: open/close transitions + status side effects

---

## Phase 6 — Fuel & Expense Management

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

**Fuel logs**
- [ ] `fuel_logs` table + migration (vehicle_id, trip_id?, liters, cost, date, odometer 🟨, notes, audit)
- [ ] CHECK liters>0, cost≥0
- [ ] Index vehicle_id, date, trip_id
- [ ] `GET/POST /fuel-logs`, `GET/PUT/DELETE /fuel-logs/:id`
- [ ] Validation: liters>0, cost≥0, date ≤ today 🟨
- [ ] UI: fuel list + add/edit form

**Expenses**
- [ ] `expenses` table + migration (vehicle_id, trip_id?, maintenance_id?, category, amount, date, description, audit)
- [ ] CHECK amount≥0; category enum
- [ ] Index vehicle_id, category, date
- [ ] `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`
- [ ] Validation: amount≥0, date ≤ today 🟨, category ∈ enum
- [ ] UI: expense list + add/edit form

**Operational cost**
- [ ] Auto-compute total operational cost = Fuel + Maintenance per vehicle (§14)
- [ ] `GET /vehicles/:id/operational-cost`
- [ ] Avoid double-counting maintenance (§18-E)
- [ ] Per-vehicle cost summary UI

**Edge cases / tests**
- [ ] Zero/negative liters rejected
- [ ] Future-dated fuel/expense rejected 🟨
- [ ] Aggregation correctness test

---

## Phase 7 — Dashboard KPIs

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

- [ ] `GET /dashboard/kpis?type=&status=&region=`
- [ ] Active Vehicles (On Trip)
- [ ] Available Vehicles
- [ ] Vehicles in Maintenance (In Shop)
- [ ] Active Trips (Dispatched)
- [ ] Pending Trips (Draft)
- [ ] Drivers On Duty (§13 🟨 definition as a single constant)
- [ ] Fleet Utilization % with divide-by-zero guard
- [ ] Filters: vehicle type / status / region
- [ ] Single/few-query aggregation (no N+1, §17)
- [ ] UI: 7 KPI cards
- [ ] UI: filter bar
- [ ] Refresh on load + on mutation (real-time, §18-K)
- [ ] Empty (zero fleet) → all 0, no NaN
- [ ] Loading skeleton tiles
- [ ] Error tile state
- [ ] Tests: KPI formulas + empty fleet

---

## Phase 8 — Reports & Analytics

- [ ] Database
- [ ] Backend
- [ ] Validation
- [ ] APIs
- [ ] UI
- [ ] Testing
- [ ] Edge Cases
- [ ] Documentation

- [x] Resolve Revenue field for ROI (§18-F) — **decided: add trips.revenue, capture on complete (Option A, approved)**
- [ ] Fuel Efficiency = Distance/Fuel (§14) + N/A guard when fuel=0
- [ ] Fleet Utilization report
- [ ] Operational Cost report (Fuel+Maintenance, no double count)
- [ ] Vehicle ROI = (Revenue−(Maintenance+Fuel))/Acquisition Cost + N/A when cost=0
- [ ] `GET /reports/fuel-efficiency`
- [ ] `GET /reports/utilization`
- [ ] `GET /reports/operational-cost`
- [ ] `GET /reports/roi`
- [ ] `GET /reports/export?format=csv` (mandatory)
- [ ] SQL-aggregate computation (no app-side loops, §17)
- [ ] UI: reports page (tables + filters)
- [ ] UI: export CSV button
- [ ] Date-range / vehicle filters
- [ ] Edge: no-data → N/A, empty CSV with headers
- [ ] Tests: each formula incl. divide-by-zero

---

## Phase 9 — Bonus Features (time permitting)

- [ ] Charts & visual analytics
- [ ] PDF export
- [ ] Email reminders for expiring licenses (`GET /drivers/expiring-licenses`)
- [ ] Vehicle document management
- [ ] Advanced search / filters / sorting across modules
- [ ] Dark mode toggle

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
- _(none yet)_

---

*Keep this file honest. A green checkbox must mean the task is truly done and, where
applicable, tested.*
