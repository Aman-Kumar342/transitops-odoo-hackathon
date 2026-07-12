# TransitOps — Problem Analysis & Engineering Source of Truth

> **Status:** Domain analysis (pre-implementation).
> **Scope:** This document reverse-engineers the complete TransitOps system from the
> official problem statement. It is the single source of truth. If code and this
> document disagree, this document wins until formally amended.
>
> **Legend:**
> - 🟥 **MANDATORY** — explicitly required by the PDF. Missing it = rejected.
> - 🟦 **IMPLIED** — not written, but logically required for the mandatory features to work.
> - 🟨 **ASSUMPTION** — a gap in the PDF resolved by a documented decision (see §18).
> - 🟩 **BONUS** — listed as optional/bonus in the PDF.

---

## Table of Contents
1. Executive Summary
2. Product Vision
3. Actors / User Roles
4. Functional Modules
5. Complete Business Rules
6. Entity Relationship Analysis
7. Status Machines
8. Complete Workflow Analysis
9. Validation Matrix
10. UI Screen Inventory
11. API Inventory
12. Database Design
13. Dashboard KPIs
14. Analytics
15. Edge Cases
16. Security Analysis
17. Performance Considerations
18. Missing Requirements & Assumptions
19. Development Phases
20. Final Engineering Checklist

---

# 1. Executive Summary

### What problem are we solving?
Many logistics and transport companies still run their operations on **spreadsheets
and manual logbooks**. There is no single system that connects vehicles, drivers,
trips, maintenance, and money. TransitOps replaces those disconnected artifacts with
one centralized operations platform.

### Why does it exist?
Because manual, disconnected record-keeping produces operational failures that cost
money and create safety/legal risk. The platform exists to **enforce operational
business rules automatically** (rules a spreadsheet cannot enforce) and to **surface
operational insight** (utilization, cost, efficiency, ROI) that is invisible when
data lives in separate files.

### What pain points exist today? (from §1 Business Context)
| # | Pain Point | Root Cause | How TransitOps fixes it |
|---|-----------|-----------|--------------------------|
| P1 | Scheduling conflicts | Same vehicle/driver double-booked | Hard rule: a resource already `On Trip` cannot be assigned again. |
| P2 | Underutilized vehicles | No visibility into idle assets | Fleet Utilization KPI + Available/On-Trip counts. |
| P3 | Missed maintenance | No maintenance tracking | Maintenance module + auto `In Shop` status + records. |
| P4 | Expired driver licenses | No license-expiry tracking | License expiry field + rule blocking expired-license dispatch + (bonus) reminders. |
| P5 | Inaccurate expense tracking | Costs recorded ad-hoc | Fuel logs + expenses + auto total operational cost per vehicle. |
| P6 | Poor operational visibility | Data siloed in sheets | Real-time dashboard + analytics + reports. |

### Business value delivered
- **Prevents costly operational errors** (double-dispatch, overloading, illegal-license trips).
- **Increases asset utilization** through visibility.
- **Improves safety & compliance** (license validity, safety scores, suspension enforcement).
- **Gives finance a true cost/ROI picture** per vehicle and per fleet.
- **Creates a single, auditable operational record** replacing spreadsheets.

---

# 2. Product Vision

TransitOps should feel like a **calm, authoritative operations control tower**. A
fleet manager logs in and immediately sees the state of the whole fleet — how many
vehicles are running, idle, or in the shop; how many trips are live or pending; which
drivers are on duty; and how efficiently the fleet is being used. Nothing requires a
spreadsheet lookup. Every action that *should* be impossible (dispatching a retired
vehicle, overloading a van, sending a driver with an expired license) is simply not
offered by the UI and is rejected by the server if attempted anyway.

### The end-to-end lifecycle the product must express
1. **Onboard the asset.** A vehicle is registered with a unique registration number,
   capacity, odometer, and acquisition cost. It starts life `Available`.
2. **Onboard the operator.** A driver is registered with license details, category,
   expiry, contact, and a safety score. They start `Available`.
3. **Plan work.** A trip is drafted: source, destination, planned distance, cargo
   weight — and an *eligible* vehicle and *eligible* driver are selected. The system
   validates capacity and eligibility.
4. **Dispatch.** On dispatch the trip becomes `Dispatched`, and both the vehicle and
   driver flip to `On Trip` — instantly removing them from every other selection pool.
5. **Operate.** The trip is live; the dashboard reflects it in real time.
6. **Close the loop.** On completion the operator enters the final odometer and fuel
   consumed. The vehicle and driver return to `Available`. Fuel and expense data are
   captured against the vehicle.
7. **Service the asset.** Maintenance is logged; the vehicle drops to `In Shop` and
   disappears from dispatch until the maintenance is closed.
8. **See the truth.** Reports recompute fuel efficiency, operational cost, utilization,
   and ROI from the latest trips, fuel logs, and maintenance — and can be exported.

The result: an operator can trust the screen. What it shows is what is true, right now.

---

# 3. Actors / User Roles

The PDF names four target users (§2) and requires RBAC (§3.1). Roles are stored as
data (`Roles` entity), so the set is extensible, but the four below are mandatory.

> ⚠️ **Important ambiguity (documented in §18-A):** §2 says the **Driver** "Creates
> trips, assigns vehicles and drivers, and monitors active deliveries." This is
> operationally unusual (drivers normally do not self-assign). We follow the PDF
> literally for grading but recommend that trip *creation/dispatch* be available to
> **Fleet Manager** as well. See §18-A for the resolution.

### 3.1 Fleet Manager 🟥
- **Purpose:** Owns fleet assets and overall operational efficiency.
- **Responsibilities:** Register/maintain vehicles, oversee maintenance and vehicle
  lifecycle (including retirement), monitor utilization, oversee trips.
- **Permissions:** Full CRUD on Vehicles and Maintenance; view all trips, drivers,
  fuel, expenses, dashboard, and reports. Can dispatch/complete/cancel trips.
- **Restrictions:** Not primarily responsible for driver compliance judgments (that
  is the Safety Officer's remit) though can view them. Should not alter another user's
  account (admin concern).
- **Expected workflow:** Register vehicle → assign to trips → send to maintenance when
  due → retire at end of life → review utilization/cost reports.

### 3.2 Driver 🟥
- **Purpose:** Executes trips; per §2 also creates trips and assigns resources.
- **Responsibilities:** Create trips (source/destination/cargo/distance), select
  available vehicle + driver, monitor active deliveries, complete trips by entering
  final odometer and fuel consumed.
- **Permissions:** Create/read trips; read own profile; read available vehicles/drivers
  for selection; record fuel/expense on completion.
- **Restrictions:** Cannot register or retire vehicles; cannot manage other users;
  cannot alter driver compliance data (license/suspension) — that is Safety Officer.
  Cannot pick ineligible resources (enforced by rules).
- **Expected workflow:** Create trip → pick eligible vehicle + driver → dispatch →
  operate → complete with odometer + fuel.

### 3.3 Safety Officer 🟥
- **Purpose:** Guardian of driver compliance and safety.
- **Responsibilities:** Manage driver profiles' compliance fields (license number,
  category, expiry, status), track license validity, monitor safety scores, suspend
  drivers.
- **Permissions:** Full CRUD on Drivers (esp. license/expiry/status/safety score);
  view trips and dashboard; receive/act on expiring-license reminders (bonus).
- **Restrictions:** Not responsible for vehicle registry or financials (view-only there).
- **Expected workflow:** Register driver → keep license/expiry current → suspend on
  incident → monitor safety scores → clear/reinstate.

### 3.4 Financial Analyst 🟥
- **Purpose:** Owns the money view of operations.
- **Responsibilities:** Review operational expenses, fuel consumption, maintenance
  costs, and profitability (ROI).
- **Permissions:** Full read on Fuel Logs, Expenses, Maintenance costs, Reports &
  Analytics; export CSV/PDF. Can create/adjust expense and fuel records 🟨 (see §18).
- **Restrictions:** Not responsible for dispatching, vehicle registry lifecycle, or
  driver compliance (view-only there).
- **Expected workflow:** Review per-vehicle operational cost → analyze fuel efficiency
  and ROI → export reports for finance.

### 3.5 Administrator 🟦 (IMPLIED)
RBAC + a `Users`/`Roles` model implies **someone must create users and assign roles**.
The four named roles do not include "manage users." We therefore define an implied
**Admin** role:
- **Purpose:** System/account administration.
- **Responsibilities:** Create/deactivate users, assign roles, seed roles, view audit
  logs.
- **Permissions:** Full user & role management; read-all.
- **Recommendation:** Ship a seeded admin account. If time-constrained, fold user
  management under Fleet Manager but keep the permission conceptually separate.

### Role → Module permission matrix (target)
`C`reate `R`ead `U`pdate `D`elete · `—` none

| Module | Admin | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|--------|:-----:|:-------------:|:------:|:--------------:|:-----------------:|
| Users/Roles | CRUD | R (self) | R (self) | R (self) | R (self) |
| Vehicles | CRUD | CRUD | R | R | R |
| Drivers | CRUD | R | R (self) | CRUD | R |
| Trips | CRUD | CRUD | CRU | R | R |
| Maintenance | CRUD | CRUD | R | R | R |
| Fuel Logs | CRUD | CR | C (on complete) | R | CRU |
| Expenses | CRUD | CR | — | R | CRU |
| Dashboard | R | R | R | R | R |
| Reports/Analytics | R | R | R | R | R + export |

> This matrix is the RBAC design target; it is an engineering decision built on the
> PDF's role descriptions. Grading only requires that RBAC *exists and is enforced*.

---

# 4. Functional Modules

Each module below is specified with: Purpose · Features · CRUD · Validation ·
Relationships · UI screens · APIs · DB tables · Edge cases · Failure cases ·
Success flow · Error flow. Cross-references point to §5 (rules), §11 (APIs), §12 (DB).

## 4.1 Authentication & Authorization 🟥
- **Purpose:** Secure the app; only authenticated users get in; enforce RBAC.
- **Features:** Email+password login, session/token issuance, logout, RBAC guard on
  every route, password hashing. 🟦 (implied): password reset, "current user" endpoint.
- **CRUD:** Users: C (admin/seed), R, U (profile/password), D/deactivate.
- **Validation:** Email format; password strength/min length; unique email; correct
  credentials; active account; valid/unexpired token.
- **Relationships:** `User` → `Role` (many users to one role, or user↔role link).
- **UI screens:** Login; (bonus) forgot/reset password; unauthorized (403) page;
  session-expired handling.
- **APIs:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, (impl) `POST /auth/refresh`.
- **DB tables:** `users`, `roles` (+ optional `user_roles`).
- **Edge cases:** wrong password, unknown email, deactivated user, expired token,
  concurrent logins, brute-force attempts, case-sensitivity of email.
- **Failure cases:** DB down at login; token secret rotation invalidating sessions.
- **Success flow:** valid creds → token → access granted per role.
- **Error flow:** invalid creds → generic "invalid email or password" (no user
  enumeration) → 401.

## 4.2 Dashboard 🟥
- **Purpose:** Real-time operational overview.
- **Features:** KPI tiles (§13) — Active Vehicles, Available Vehicles, Vehicles in
  Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %.
  Filters by **vehicle type, status, region**.
- **CRUD:** Read-only (aggregations).
- **Validation:** Filter values must be valid enum members; ignore/echo unknown filters
  safely.
- **Relationships:** Aggregates Vehicles, Trips, Drivers.
- **UI screens:** Dashboard home with KPI cards, filter bar, (bonus) charts.
- **APIs:** `GET /dashboard/kpis?type=&status=&region=`.
- **DB tables:** reads `vehicles`, `trips`, `drivers`.
- **Edge cases:** empty fleet (all zeros, no divide-by-zero in utilization); all
  vehicles retired; filter combination yielding zero rows.
- **Failure cases:** slow aggregation on large fleet (mitigate with indexes/§17).
- **Success flow:** load → counts computed → tiles render.
- **Error flow:** aggregation error → tiles show error state, not blank/NaN.
- **Note 🟨:** "region" is a filter dimension but no entity has a region field in the
  PDF. We must add `region` to Vehicles (and/or Trips). See §18-C.

## 4.3 Vehicle Registry 🟥
- **Purpose:** Master list of all vehicles and their lifecycle.
- **Features:** Register/edit/retire vehicles; list with search/filter/sort (bonus).
- **Fields:** Registration Number (**unique**), Vehicle Name/Model, Type, Maximum Load
  Capacity, Odometer, Acquisition Cost, Status.
- **Status values:** `Available`, `On Trip`, `In Shop`, `Retired`.
- **CRUD:** Create, Read (list+detail), Update, Delete → **soft delete = Retired** 🟨.
- **Validation:** unique reg no; capacity > 0; odometer ≥ 0 and monotonic non-decreasing;
  acquisition cost ≥ 0; type ∈ allowed set; status transitions valid (§7.1).
- **Relationships:** Vehicle → Trips (1:N), → Maintenance (1:N), → Fuel Logs (1:N),
  → Expenses (1:N).
- **UI screens:** Vehicle list (table, filters, search), Create/Edit form, Vehicle
  detail (with trips/maintenance/fuel history), Retire confirm dialog.
- **APIs:** `GET/POST /vehicles`, `GET/PUT/DELETE /vehicles/:id`,
  `GET /vehicles/available` (dispatch pool).
- **DB tables:** `vehicles`.
- **Edge cases:** duplicate reg no (diff case/whitespace); retiring an `On Trip`
  vehicle; editing capacity below an in-progress trip's cargo; odometer decreasing.
- **Failure cases:** delete of a vehicle referenced by historical trips (must retain
  history → soft delete only).
- **Success flow:** create with unique reg no → `Available`.
- **Error flow:** duplicate reg no → 409 + field error.

## 4.4 Driver Management 🟥
- **Purpose:** Master list of drivers and compliance state.
- **Features:** Register/edit drivers; suspend/reinstate; track license validity and
  safety score.
- **Fields:** Name, License Number, License Category, License Expiry Date, Contact
  Number, Safety Score, Status.
- **Status values:** `Available`, `On Trip`, `Off Duty`, `Suspended`.
- **CRUD:** Create, Read, Update, Delete → **soft delete/deactivate** 🟨.
- **Validation:** license number present/unique 🟨; expiry is a real date; contact
  number format; safety score within range (0–100 🟨); status transitions valid (§7.2).
- **Relationships:** Driver → Trips (1:N). Optionally Driver ↔ User (§18-B).
- **UI screens:** Driver list, Create/Edit form, Driver detail (license status badge,
  trip history), Suspend/Reinstate dialog.
- **APIs:** `GET/POST /drivers`, `GET/PUT/DELETE /drivers/:id`,
  `GET /drivers/available` (dispatch pool), `GET /drivers/expiring-licenses` (bonus).
- **DB tables:** `drivers`.
- **Edge cases:** license expiring today (boundary); suspended mid-trip; safety score
  out of range; duplicate license number.
- **Failure cases:** deleting a driver with historical trips (soft delete only).
- **Success flow:** valid license + within range → `Available`.
- **Error flow:** expired expiry date on create → warn/allow but ineligible for trips.

## 4.5 Trip Management 🟥
- **Purpose:** Plan, dispatch, complete, and cancel trips.
- **Features:** Create trip (source, destination, available vehicle, available driver,
  cargo weight, planned distance); lifecycle transitions with automatic status side
  effects.
- **Lifecycle:** `Draft` → `Dispatched` → `Completed`; `Draft`/`Dispatched` → `Cancelled`.
- **Fields:** source, destination, vehicle_id, driver_id, cargo_weight, planned_distance,
  status, final_odometer (on complete), fuel_consumed (on complete) 🟦, timestamps.
- **CRUD:** Create (Draft), Read, Update (while Draft), state transitions; Delete only
  while Draft 🟨 (else Cancel).
- **Validation (§5 rules R2–R8):** vehicle & driver must be *eligible* (not retired/in
  shop/on-trip/suspended/expired); cargo ≤ capacity; no double assignment; valid
  transition; final odometer ≥ start odometer on completion.
- **Relationships:** Trip → Vehicle (N:1), → Driver (N:1); Trip → Fuel Log (on complete)
  🟨.
- **UI screens:** Trip list (by status), Create trip wizard (eligible-only pickers),
  Trip detail, Dispatch/Complete/Cancel actions with confirm dialogs, Complete form
  (final odometer + fuel).
- **APIs:** `GET/POST /trips`, `GET/PUT /trips/:id`, `POST /trips/:id/dispatch`,
  `POST /trips/:id/complete`, `POST /trips/:id/cancel`.
- **DB tables:** `trips`.
- **Edge cases:** two users dispatch same vehicle/driver simultaneously (race → §15);
  cargo exactly equal to capacity (allowed); completing an already-completed trip;
  cancelling a completed trip (invalid); vehicle retired while trip in Draft.
- **Failure cases:** partial status update (trip dispatched but driver flip failed) →
  must be transactional (§15, §16).
- **Success flow:** create Draft → dispatch (vehicle+driver→On Trip) → complete
  (both→Available, fuel/odometer captured).
- **Error flow:** ineligible resource selected → 422 with reason; concurrent dispatch
  loser → 409.

## 4.6 Maintenance 🟥
- **Purpose:** Track vehicle servicing; enforce In-Shop status.
- **Features:** Create maintenance record (type/description, cost, dates); open record
  → vehicle `In Shop`; close record → vehicle `Available` (unless retired).
- **CRUD:** Create, Read, Update, Close (state), soft delete.
- **Validation:** vehicle must exist & not already In Shop for an open record 🟨;
  cost ≥ 0; vehicle **not `On Trip`** when opening 🟨 (see edge case); close only an
  open record.
- **Relationships:** Maintenance → Vehicle (N:1); cost feeds Operational Cost & ROI.
- **UI screens:** Maintenance list, Create form, Maintenance detail, Close dialog.
- **APIs:** `GET/POST /maintenance`, `GET/PUT /maintenance/:id`,
  `POST /maintenance/:id/close`.
- **DB tables:** `maintenance_logs`.
- **Edge cases:** opening maintenance on an `On Trip` vehicle (block or require trip
  end first — §18-D); overlapping open maintenance records; closing an already-closed
  record; closing maintenance for a retired vehicle (stays retired).
- **Failure cases:** status flip to In Shop succeeds but record insert fails → must be
  transactional.
- **Success flow:** open record → vehicle In Shop & removed from dispatch → close →
  Available.
- **Error flow:** open on ineligible vehicle → 422 with reason.

## 4.7 Fuel & Expense Management 🟥
- **Purpose:** Capture running costs and enable cost/efficiency analytics.
- **Features:** Fuel logs (liters, cost, date); other expenses (tolls, maintenance,
  misc); auto-compute **total operational cost = Fuel + Maintenance** per vehicle.
- **CRUD:** Fuel logs CRUD; Expenses CRUD.
- **Validation:** liters > 0; cost ≥ 0; date not in future 🟨; vehicle exists; expense
  category ∈ set; amount ≥ 0.
- **Relationships:** Fuel Log → Vehicle (N:1), optionally → Trip; Expense → Vehicle
  (N:1), optionally → Trip/Maintenance.
- **UI screens:** Fuel log list + form, Expense list + form, per-vehicle cost summary.
- **APIs:** `GET/POST /fuel-logs`, `GET/PUT/DELETE /fuel-logs/:id`,
  `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`,
  `GET /vehicles/:id/operational-cost`.
- **DB tables:** `fuel_logs`, `expenses`.
- **Edge cases:** fuel with zero liters (reject); negative cost; expense with no
  vehicle; double-counting maintenance both as an expense row and via maintenance_logs
  (define single source of truth — §18-E).
- **Failure cases:** cost aggregation across large history (index by vehicle_id).
- **Success flow:** add fuel/expense → per-vehicle totals recompute.
- **Error flow:** invalid amount → 422.

## 4.8 Reports & Analytics 🟥
- **Purpose:** Turn operational data into insight.
- **Features:** Fuel Efficiency (Distance/Fuel), Fleet Utilization, Operational Cost,
  Vehicle ROI; CSV export (mandatory), PDF export (optional/bonus); (bonus) charts.
- **CRUD:** Read + export.
- **Validation:** guard divide-by-zero (fuel=0, acquisition cost=0); date-range filters
  valid.
- **Relationships:** Aggregates Trips, Fuel Logs, Maintenance, Vehicles.
- **UI screens:** Reports page (tables + filters), export buttons, (bonus) charts page.
- **APIs:** `GET /reports/fuel-efficiency`, `GET /reports/utilization`,
  `GET /reports/operational-cost`, `GET /reports/roi`, `GET /reports/export?format=csv`.
- **DB tables:** reads across all operational tables.
- **Edge cases:** vehicle with trips but no fuel logs (efficiency undefined → show N/A);
  ROI when Revenue unknown (§18-F); acquisition cost zero.
- **Failure cases:** export of very large dataset (stream/paginate).
- **Success flow:** compute metrics → render → export CSV.
- **Error flow:** undefined metric → "N/A", never NaN/Infinity.

## 4.9 Settings 🟦 (IMPLIED)
- **Purpose:** App/user preferences (profile, password change, theme/dark mode bonus,
  enum/lookup management).
- **APIs:** `PUT /auth/password`, `PUT /users/me`, `GET/PUT /settings`.

## 4.10 Role Management 🟦 (IMPLIED by RBAC + Roles entity)
- **Purpose:** Manage roles and role assignment.
- **APIs:** `GET/POST /roles`, `PUT /users/:id/role`.

---

# 5. Complete Business Rules

Every rule below is extracted or inferred. Format: **Rule · Why · Affected entities ·
Validation points (FE/BE/DB) · Example · Counter-example.**

### R1 🟥 — Vehicle registration number must be unique
- **Why:** It is the vehicle's real-world identity; duplicates corrupt every join,
  report, and dispatch decision.
- **Affected:** Vehicles.
- **FE:** async uniqueness check on blur; block submit on known duplicate.
- **BE:** check-before-insert + handle DB unique violation → 409.
- **DB:** `UNIQUE` constraint on `registration_number` (normalize case/trim 🟨).
- **Example:** "MH-12-AB-1234" registered once → OK.
- **Counter-example:** second "MH-12-AB-1234" (or "mh12ab1234" if normalized) → rejected.

### R2 🟥 — Retired or In-Shop vehicles must never appear in dispatch selection
- **Why:** Retired = out of service; In Shop = physically unavailable. Dispatching
  either is impossible in reality.
- **Affected:** Vehicles, Trips.
- **FE:** dispatch vehicle picker sources only `GET /vehicles/available`.
- **BE:** on dispatch, re-validate vehicle.status == `Available`.
- **DB:** enforced via query filter (`status='Available'`).
- **Example:** picker lists only Available vehicles.
- **Counter-example:** API call dispatching an `In Shop` vehicle → 422.

### R3 🟥 — Drivers with expired licenses or `Suspended` status cannot be assigned to trips
- **Why:** Legal/safety compliance; a core pain point (expired licenses).
- **Affected:** Drivers, Trips.
- **FE:** driver picker sources only eligible drivers; badge shows license status.
- **BE:** on dispatch, re-validate `license_expiry >= today` AND `status != Suspended`
  AND `status == Available`.
- **DB:** query filter; (optional CHECK cannot compare to "today", so app-enforced).
- **Example:** driver with expiry 2027-01-01 (today 2026-07-12) → eligible.
- **Counter-example:** expiry 2026-07-11 → ineligible; Suspended driver → ineligible.

### R4 🟥 — A driver or vehicle already `On Trip` cannot be assigned to another trip
- **Why:** Prevents double-booking (pain point P1). A physical asset is in one place.
- **Affected:** Vehicles, Drivers, Trips.
- **FE:** eligible pickers exclude `On Trip`.
- **BE:** re-validate at dispatch inside a transaction with row locking (§15 race).
- **DB:** partial unique index 🟨: at most one active (`Dispatched`) trip per vehicle
  and per driver (see §12).
- **Example:** Van-05 On Trip → not selectable.
- **Counter-example:** two trips both `Dispatched` for Van-05 → second rejected.

### R5 🟥 — Cargo weight must not exceed the vehicle's maximum load capacity
- **Why:** Overloading is illegal, unsafe, and damages assets.
- **Affected:** Trips, Vehicles.
- **FE:** validate `cargo_weight <= selected vehicle.max_load_capacity` live.
- **BE:** re-validate on create and on dispatch (capacity could change).
- **DB:** application-enforced (cross-table); optional CHECK `cargo_weight > 0`.
- **Example:** cargo 450 ≤ capacity 500 → allowed.
- **Counter-example:** cargo 501 > 500 → rejected. Boundary: 500 == 500 → allowed.

### R6 🟥 — Dispatching a trip sets both vehicle and driver status to `On Trip`
- **Why:** Keeps availability truthful and removes them from other pools instantly.
- **Affected:** Trips, Vehicles, Drivers.
- **BE:** single transaction: trip→`Dispatched`, vehicle→`On Trip`, driver→`On Trip`.
- **Example:** dispatch → all three updated atomically.
- **Counter-example:** trip Dispatched but driver still Available → invalid partial
  state (must not occur; transactional).

### R7 🟥 — Completing a trip returns both vehicle and driver to `Available`
- **Why:** Frees resources for the next trip; closes the loop.
- **Affected:** Trips, Vehicles, Drivers.
- **BE:** transaction: trip→`Completed` (+final odometer, fuel), vehicle→`Available`
  (odometer updated), driver→`Available`.
- **Example:** complete → both Available again.
- **Counter-example:** completing without final odometer → rejected 🟨 (required).

### R8 🟥 — Cancelling a dispatched trip restores vehicle and driver to `Available`
- **Why:** A cancelled dispatch must not strand resources as On Trip.
- **Affected:** Trips, Vehicles, Drivers.
- **BE:** transaction: trip→`Cancelled`, vehicle→`Available`, driver→`Available`.
- **Note:** Cancelling a *Draft* trip has no resource side effects (never dispatched).
- **Counter-example:** cancel a `Completed` trip → invalid transition (§7.3).

### R9 🟥 — Creating an active maintenance record sets vehicle status to `In Shop`
- **Why:** A servicing vehicle cannot be dispatched; enforces P3.
- **Affected:** Maintenance, Vehicles.
- **BE:** transaction: insert maintenance (open) + vehicle→`In Shop`.
- **Counter-example:** vehicle On Trip → opening maintenance blocked/queued (§18-D).

### R10 🟥 — Closing maintenance restores the vehicle to `Available` (unless Retired)
- **Why:** Vehicle is serviceable again; but a retired vehicle stays retired.
- **Affected:** Maintenance, Vehicles.
- **BE:** transaction: maintenance→closed + (if vehicle not Retired) vehicle→`Available`.
- **Counter-example:** retired vehicle stays `Retired` after close.

### Hidden / implied rules

### R11 🟦 — Odometer is monotonic non-decreasing
- Final odometer on trip completion must be ≥ the vehicle's current odometer;
  registration odometer ≥ 0. Prevents impossible mileage and corrupts distance-based
  efficiency. **BE + FE** validation.

### R12 🟦 — A trip's fuel/distance drives fuel efficiency
- Distance = planned_distance or (final − start odometer) 🟨; Fuel = fuel_consumed on
  completion / linked fuel logs. Guard divide-by-zero.

### R13 🟦 — Only eligible resources are selectable; eligibility is re-checked server-side at the moment of dispatch
- FE filtering is convenience; the server is the source of truth (defends against
  stale clients and races).

### R14 🟦 — All money/quantity fields are non-negative
- acquisition_cost, capacity, cost, liters, amount, safety_score, distance ≥ 0
  (capacity, liters > 0). DB CHECK constraints.

### R15 🟦 — Soft delete for master data
- Vehicles and Drivers are never hard-deleted (they are referenced by historical
  trips/logs). "Delete" = Retire (vehicle) / deactivate or Off Duty→archived (driver).

### R16 🟦 — Status enums are closed sets
- Any status outside the defined enum is rejected at API and DB (enum/CHECK).

### R17 🟨 — License number should be unique per driver
- Prevents duplicate driver identities. Assumption (PDF doesn't state); recommend
  UNIQUE constraint (nullable-safe).

### R18 🟦 — Every state transition must be a *valid* edge in its status machine (§7)
- Invalid transitions (e.g., Completed→Dispatched) are rejected server-side.

---

# 6. Entity Relationship Analysis

Entities (PDF §6): **Users, Roles, Vehicles, Drivers, Trips, Maintenance Logs, Fuel
Logs, Expenses.** Below each: purpose, fields (required/optional), relationships,
indexes, unique, FKs, lifecycle.

### 6.1 Roles
- **Purpose:** Define RBAC roles.
- **Required:** `id`, `name` (unique). **Optional:** `description`, `permissions` (JSON 🟨).
- **Relationships:** Role 1:N Users (or M:N via `user_roles` 🟨).
- **Unique:** `name`. **Index:** `name`.
- **Lifecycle:** static/seeded (Admin, Fleet Manager, Driver, Safety Officer,
  Financial Analyst).

### 6.2 Users
- **Purpose:** Authenticated accounts.
- **Required:** `id`, `email` (unique), `password_hash`, `name`, `role_id`, `is_active`.
- **Optional:** `phone`, `last_login_at`.
- **Relationships:** User N:1 Role; (optional) User 1:1 Driver (§18-B).
- **Unique:** `email`. **Index:** `email`, `role_id`.
- **FK:** `role_id → roles.id`.
- **Lifecycle:** invited/created → active → deactivated.

### 6.3 Vehicles
- **Purpose:** Fleet assets.
- **Required:** `id`, `registration_number` (unique), `name_model`, `type`,
  `max_load_capacity`, `odometer`, `acquisition_cost`, `status`.
- **Optional:** `region` 🟨, `documents` 🟩 (bonus), `created_at`, `updated_at`,
  `retired_at`.
- **Relationships:** 1:N Trips, Maintenance, Fuel Logs, Expenses.
- **Unique:** `registration_number` (normalized). **Indexes:** `status`, `type`,
  `region`, `registration_number`.
- **CHECK:** capacity>0, odometer≥0, acquisition_cost≥0, status∈enum.
- **Lifecycle:** see §7.1.

### 6.4 Drivers
- **Purpose:** Operators.
- **Required:** `id`, `name`, `license_number`, `license_category`,
  `license_expiry_date`, `contact_number`, `safety_score`, `status`.
- **Optional:** `user_id` (link) 🟨, `created_at`, `updated_at`.
- **Relationships:** 1:N Trips; optional 1:1 User.
- **Unique:** `license_number` 🟨. **Indexes:** `status`, `license_expiry_date`,
  `license_number`.
- **CHECK:** safety_score 0–100, status∈enum.
- **Lifecycle:** see §7.2.

### 6.5 Trips
- **Purpose:** Unit of dispatched work.
- **Required:** `id`, `source`, `destination`, `vehicle_id`, `driver_id`,
  `cargo_weight`, `planned_distance`, `status`.
- **Optional:** `start_odometer` 🟨, `final_odometer`, `fuel_consumed` 🟦,
  `revenue` ✅ (nullable; captured on completion — §18-F APPROVED), `dispatched_at`,
  `completed_at`, `cancelled_at`, `created_by`, timestamps.
- **Relationships:** N:1 Vehicle, N:1 Driver; 1:N Fuel Logs 🟨.
- **Indexes:** `status`, `vehicle_id`, `driver_id`, `created_at`.
- **Partial unique 🟨:** one `Dispatched` trip per vehicle; one per driver.
- **CHECK:** cargo_weight>0, planned_distance≥0, status∈enum.
- **FK:** `vehicle_id→vehicles.id`, `driver_id→drivers.id` (RESTRICT delete).
- **Lifecycle:** see §7.3.

### 6.6 Maintenance Logs
- **Purpose:** Service records.
- **Required:** `id`, `vehicle_id`, `type`/`description`, `cost`, `status`
  (`Open`/`Closed`) 🟨, `opened_at`.
- **Optional:** `closed_at`, `notes`, `odometer_at_service` 🟨.
- **Relationships:** N:1 Vehicle.
- **Indexes:** `vehicle_id`, `status`.
- **Partial unique 🟨:** at most one `Open` record per vehicle.
- **CHECK:** cost≥0.
- **Lifecycle:** Open → Closed.

### 6.7 Fuel Logs
- **Purpose:** Fuel purchase/consumption records.
- **Required:** `id`, `vehicle_id`, `liters`, `cost`, `date`.
- **Optional:** `trip_id`, `odometer` 🟨, `notes`.
- **Relationships:** N:1 Vehicle; optional N:1 Trip.
- **Indexes:** `vehicle_id`, `date`, `trip_id`.
- **CHECK:** liters>0, cost≥0.
- **Lifecycle:** immutable record (edit/delete allowed to fix errors 🟨).

### 6.8 Expenses
- **Purpose:** Non-fuel operational costs (tolls, misc, optionally maintenance).
- **Required:** `id`, `vehicle_id`, `category`, `amount`, `date`.
- **Optional:** `trip_id`, `maintenance_id`, `description`.
- **Relationships:** N:1 Vehicle; optional N:1 Trip/Maintenance.
- **Indexes:** `vehicle_id`, `category`, `date`.
- **CHECK:** amount≥0, category∈enum.
- **Lifecycle:** record; editable to fix errors.

### ER Diagram (textual)
```
Roles 1───N Users
Users 1───0..1 Drivers            (optional link)
Vehicles 1───N Trips N───1 Drivers
Vehicles 1───N MaintenanceLogs
Vehicles 1───N FuelLogs
Vehicles 1───N Expenses
Trips 1───N FuelLogs              (optional)
Trips 1───N Expenses              (optional)
MaintenanceLogs 1───0..N Expenses (optional, if maintenance cost mirrored)
```

---

# 7. Status Machines

## 7.1 Vehicle states
States: `Available`, `On Trip`, `In Shop`, `Retired`.
```
                 dispatch trip (R6)
   ┌──────────────────────────────────────────┐
   │                                           ▼
[Available] ──open maintenance (R9)──> [In Shop]
   ▲  ▲                                     │
   │  │  close maintenance (R10)            │
   │  └─────────────────────────────────────┘
   │
   │  complete trip (R7) / cancel dispatched (R8)
[On Trip] ───────────────────────────────────┘

Any non-terminal state ──retire──> [Retired]  (terminal)
```
**Valid transitions**
| From | To | Trigger |
|------|----|---------|
| Available | On Trip | Trip dispatched (R6) |
| Available | In Shop | Maintenance opened (R9) |
| Available | Retired | Manual retire |
| On Trip | Available | Trip completed (R7) or dispatched-trip cancelled (R8) |
| In Shop | Available | Maintenance closed (R10) |
| In Shop | Retired | Retire during service |
| On Trip | Retired | ⚠️ blocked — must finish/cancel trip first (§15) |

**Invalid transitions (rejected):** On Trip→In Shop (must end trip first); Retired→any
(terminal); In Shop→On Trip (must close maintenance first); On Trip→Retired directly.

## 7.2 Driver states
States: `Available`, `On Trip`, `Off Duty`, `Suspended`.
```
[Available] ──dispatch (R6)──> [On Trip] ──complete/cancel (R7/R8)──> [Available]
[Available] <──clock in/out──> [Off Duty]
[Available]/[Off Duty] ──suspend──> [Suspended] ──reinstate──> [Available]
```
**Valid transitions**
| From | To | Trigger |
|------|----|---------|
| Available | On Trip | Trip dispatched |
| On Trip | Available | Trip completed/cancelled |
| Available | Off Duty | Manual (end shift) |
| Off Duty | Available | Manual (start shift) |
| Available/Off Duty | Suspended | Safety Officer suspends |
| Suspended | Available | Safety Officer reinstates |

**Invalid:** On Trip→Suspended (must end trip first 🟨, or force-cancel §15);
Off Duty→On Trip directly (must become Available first); Suspended→On Trip (blocked by
R3); dispatch of expired-license driver (blocked by R3).

## 7.3 Trip states
States: `Draft`, `Dispatched`, `Completed`, `Cancelled`.
```
[Draft] ──dispatch──> [Dispatched] ──complete──> [Completed]  (terminal)
   │                        │
   └──cancel──> [Cancelled] <┘        [Cancelled] (terminal)
```
**Valid transitions**
| From | To | Trigger | Side effects |
|------|----|---------|--------------|
| Draft | Dispatched | Dispatch | vehicle+driver→On Trip (R6) |
| Draft | Cancelled | Cancel | none (never dispatched) |
| Dispatched | Completed | Complete | vehicle+driver→Available; odometer+fuel captured (R7) |
| Dispatched | Cancelled | Cancel | vehicle+driver→Available (R8) |

**Invalid:** Completed→anything (terminal); Cancelled→anything (terminal);
Draft→Completed (must dispatch first); Dispatched→Draft.

## 7.4 Maintenance states 🟨
States: `Open`, `Closed`.
```
[Open] ──close──> [Closed] (terminal)
```
Open → vehicle In Shop (R9). Close → vehicle Available unless Retired (R10). Invalid:
Closed→Open (open a new record instead).

---

# 8. Complete Workflow Analysis

### 8.1 Vehicle registration
1. Fleet Manager opens Vehicle → Create.
2. Enters reg no, name/model, type, capacity, odometer, acquisition cost (+region 🟨).
3. FE validates formats + async unique reg no.
4. Submit → `POST /vehicles`.
5. BE validates + normalizes reg no; checks uniqueness.
6. Insert with `status=Available`.
7. On duplicate → 409 field error; else 201 + vehicle appears in list & dispatch pool.

### 8.2 Driver creation
1. Safety Officer opens Driver → Create.
2. Enters name, license number/category/expiry, contact, safety score.
3. FE validates date, contact format, score range.
4. `POST /drivers` → BE validates + (unique license 🟨) → insert `status=Available`.
5. If expiry ≤ today, driver is created but **ineligible for trips** (R3).

### 8.3 Trip dispatch
1. Driver/Fleet Manager opens Trip → Create.
2. Enters source, destination, cargo weight, planned distance.
3. Selects vehicle from `GET /vehicles/available`; driver from eligible drivers.
4. FE validates cargo ≤ capacity live.
5. `POST /trips` creates `Draft`.
6. User clicks Dispatch → `POST /trips/:id/dispatch`.
7. BE opens transaction, **locks** vehicle+driver rows, re-validates R2–R5.
8. Sets trip→Dispatched, vehicle→On Trip, driver→On Trip; commit.
9. Both disappear from all pools; dashboard Active Trips +1.
10. On any failure → rollback, resources untouched, 409/422.

### 8.4 Trip completion
1. On arrival, user opens the Dispatched trip → Complete.
2. Enters final odometer (≥ start) and fuel consumed.
3. `POST /trips/:id/complete`.
4. BE transaction: validate odometer monotonic; trip→Completed; vehicle→Available +
   odometer updated; driver→Available; create/attach fuel log 🟨.
5. Reports recompute fuel efficiency + operational cost.

### 8.5 Trip cancellation
1. User cancels a Draft or Dispatched trip.
2. `POST /trips/:id/cancel`.
3. If was Dispatched → transaction restores vehicle+driver→Available (R8). If Draft →
   just mark Cancelled.

### 8.6 Maintenance
1. Fleet Manager opens Maintenance → Create for a vehicle.
2. Vehicle must not be On Trip (§18-D); enters type, cost, dates.
3. `POST /maintenance` → transaction: insert Open + vehicle→In Shop (R9).
4. Vehicle removed from dispatch pool.
5. On service done → `POST /maintenance/:id/close` → vehicle→Available unless Retired (R10).

### 8.7 Fuel logging
1. User opens Fuel → Add for a vehicle (optionally a trip).
2. Enters liters (>0), cost (≥0), date (≤ today 🟨), odometer 🟨.
3. `POST /fuel-logs` → validate → insert.
4. Per-vehicle operational cost + fuel efficiency recompute.

### 8.8 Expense logging
1. Financial Analyst/Fleet Manager opens Expense → Add.
2. Enters category, amount (≥0), date, vehicle (optionally trip/maintenance).
3. `POST /expenses` → validate → insert.
4. Operational cost recompute.

### 8.9 Dashboard update
1. User loads dashboard (+optional filters type/status/region).
2. `GET /dashboard/kpis` aggregates live counts (§13).
3. Tiles render; refresh on navigation / interval / on mutation 🟨.

### 8.10 Analytics generation
1. User opens Reports (+date range/filters).
2. `GET /reports/*` computes fuel efficiency, utilization, operational cost, ROI (§14).
3. Guards divide-by-zero → N/A.
4. Export CSV (mandatory) / PDF (bonus).

---

# 9. Validation Matrix

Layers: **FE** (form/UX), **BE** (API business logic), **DB** (constraint).

| Screen / Field | Required | Format (FE) | Business (BE) | DB |
|---|---|---|---|---|
| **Login** email | ✔ | valid email regex | credential match, active user | — |
| Login password | ✔ | min length | hash compare | — |
| **Vehicle** reg no | ✔ | non-empty, pattern 🟨 | unique (normalized) | UNIQUE |
| Vehicle name/model | ✔ | non-empty | — | NOT NULL |
| Vehicle type | ✔ | ∈ enum | ∈ enum | CHECK/enum |
| Vehicle capacity | ✔ | number > 0 | > 0 | CHECK >0 |
| Vehicle odometer | ✔ | number ≥ 0 | ≥ 0, monotonic (R11) | CHECK ≥0 |
| Vehicle acq. cost | ✔ | number ≥ 0 | ≥ 0 | CHECK ≥0 |
| Vehicle status | ✔ | ∈ enum | valid transition (§7.1) | enum |
| Vehicle region 🟨 | ✖ | text/enum | — | — |
| **Driver** name | ✔ | non-empty | — | NOT NULL |
| Driver license no | ✔ | pattern 🟨 | unique 🟨 | UNIQUE 🟨 |
| Driver license cat | ✔ | ∈ set | — | — |
| Driver expiry date | ✔ | valid date | eligibility (R3) | DATE |
| Driver contact | ✔ | phone pattern | — | — |
| Driver safety score | ✔ | 0–100 | 0–100 | CHECK 0–100 |
| Driver status | ✔ | ∈ enum | valid transition (§7.2) | enum |
| **Trip** source/dest | ✔ | non-empty | — | NOT NULL |
| Trip vehicle | ✔ | selected | R2, R4 eligible | FK |
| Trip driver | ✔ | selected | R3, R4 eligible | FK |
| Trip cargo weight | ✔ | number > 0 | ≤ capacity (R5) | CHECK >0 |
| Trip planned dist. | ✔ | number ≥ 0 | ≥ 0 | CHECK ≥0 |
| Trip final odometer | ✔ on complete | ≥ start | ≥ vehicle odometer (R11) | — |
| Trip fuel consumed | ✔ on complete 🟨 | > 0 | > 0 | — |
| **Maintenance** vehicle | ✔ | selected | not On Trip 🟨, exists | FK |
| Maintenance cost | ✔ | number ≥ 0 | ≥ 0 | CHECK ≥0 |
| Maintenance status | ✔ | Open/Closed | valid transition (§7.4) | enum |
| **Fuel** liters | ✔ | number > 0 | > 0 | CHECK >0 |
| Fuel cost | ✔ | number ≥ 0 | ≥ 0 | CHECK ≥0 |
| Fuel date | ✔ | valid date | ≤ today 🟨 | DATE |
| **Expense** category | ✔ | ∈ enum | ∈ enum | enum |
| Expense amount | ✔ | number ≥ 0 | ≥ 0 | CHECK ≥0 |
| Expense date | ✔ | valid date | ≤ today 🟨 | DATE |

---

# 10. UI Screen Inventory

For each: purpose, components, buttons, tables, filters, actions, dialogs, empty/
loading/error states, permissions.

1. **Login** — email/password form; submit; error banner; loading spinner; no auth
   required. Empty=blank form; error=invalid creds.
2. **Dashboard** — KPI cards (7), filter bar (type/status/region), (bonus) charts.
   Empty=all-zero fleet; loading=skeleton tiles; error=tile error state. All roles.
3. **Vehicle List** — table (reg no, name, type, capacity, odometer, status), search,
   filters (type/status/region), sort, "New Vehicle" btn, row actions (view/edit/
   retire). Empty="No vehicles yet"; loading=skeleton rows; error=retry. FM/Admin edit.
4. **Vehicle Create/Edit** — form fields (§9), Save/Cancel, inline validation, async
   reg-no check. FM/Admin.
5. **Vehicle Detail** — profile + tabs (trips, maintenance, fuel, expenses, cost);
   Retire dialog. All read; FM edit.
6. **Driver List** — table (name, license no, category, expiry w/ badge, safety score,
   status), search, filters, "New Driver", actions. Safety Officer edit.
7. **Driver Create/Edit** — form (§9), Save/Cancel, validation. Safety Officer.
8. **Driver Detail** — profile, license-status badge, trip history, Suspend/Reinstate
   dialog. Safety Officer edit.
9. **Trip List** — tabs/filter by status (Draft/Dispatched/Completed/Cancelled),
   table (route, vehicle, driver, cargo, distance, status), "New Trip". Driver/FM.
10. **Trip Create** — source/dest/cargo/distance + eligible-only vehicle & driver
    pickers + live capacity check; Save as Draft; Dispatch. Driver/FM.
11. **Trip Detail** — route/resources/status timeline; Dispatch/Complete/Cancel
    actions; Complete form (final odometer + fuel). Dialogs for each action.
12. **Maintenance List** — table (vehicle, type, cost, status, dates), "New", Close
    action. FM edit.
13. **Maintenance Create** — vehicle picker (not On Trip), type, cost, dates. FM.
14. **Fuel Log List + Form** — table (vehicle, liters, cost, date), "Add Fuel". FA/FM.
15. **Expense List + Form** — table (vehicle, category, amount, date), "Add Expense". FA/FM.
16. **Reports & Analytics** — metric tables (fuel efficiency, utilization, operational
    cost, ROI), date/vehicle filters, Export CSV (btn), Export PDF (bonus), charts
    (bonus). All read; FA export.
17. **Settings** — profile, change password, dark-mode toggle (bonus). All (self).
18. **Role/User Management** 🟦 — user list, role assignment. Admin.
19. **403 Unauthorized / 404 / Session expired** — global error/empty states.

**Global states to implement everywhere:** loading skeletons, empty states with CTA,
error states with retry, disabled controls for insufficient permissions, toasts for
success/error.

---

# 11. API Inventory

Convention: JSON, JWT/session auth on all except login; RBAC per §3 matrix; standard
codes (200/201/204/400/401/403/404/409/422/500). All list endpoints support
`?page=&limit=&sort=&search=&<filters>`.

### Auth
| Method | Route | Purpose | Auth | Validation | Success | Failure |
|---|---|---|---|---|---|---|
| POST | /auth/login | login | none | email+pwd | 200 {token,user} | 401 invalid |
| POST | /auth/logout | logout | user | — | 204 | 401 |
| GET | /auth/me | current user | user | token | 200 {user} | 401 |
| PUT | /auth/password | change pwd | user | old+new strength | 204 | 400/401 |

### Users / Roles 🟦
`GET/POST /users`, `GET/PUT/DELETE /users/:id`, `PUT /users/:id/role`,
`GET/POST /roles` — Admin only.

### Vehicles
| GET | /vehicles | list+filter | all | filters | 200 [list] | 401 |
| POST | /vehicles | create | FM/Admin | §9 + R1 | 201 | 409 dup / 422 |
| GET | /vehicles/:id | detail | all | — | 200 | 404 |
| PUT | /vehicles/:id | update | FM/Admin | §9, §7.1 | 200 | 409/422/404 |
| DELETE | /vehicles/:id | retire (soft) | FM/Admin | not On Trip | 204 | 409/422 |
| GET | /vehicles/available | dispatch pool | Driver/FM | status=Available | 200 | 401 |
| GET | /vehicles/:id/operational-cost | cost | FA/FM | — | 200 | 404 |

### Drivers
`GET/POST /drivers`, `GET/PUT/DELETE /drivers/:id`, `GET /drivers/available`
(eligible: Available & !expired & !Suspended), `POST /drivers/:id/suspend`,
`POST /drivers/:id/reinstate`, `GET /drivers/expiring-licenses` (bonus).

### Trips
| GET | /trips | list by status | Driver/FM | filters | 200 | 401 |
| POST | /trips | create Draft | Driver/FM | R3–R5 | 201 | 422 |
| GET | /trips/:id | detail | all | — | 200 | 404 |
| PUT | /trips/:id | edit Draft | Driver/FM | Draft only | 200 | 409 |
| POST | /trips/:id/dispatch | dispatch | Driver/FM | R2–R6 (txn+lock) | 200 | 409 race/422 |
| POST | /trips/:id/complete | complete | Driver/FM | R7,R11 odometer+fuel | 200 | 422 |
| POST | /trips/:id/cancel | cancel | Driver/FM | R8, §7.3 | 200 | 422 |

### Maintenance
`GET/POST /maintenance`, `GET/PUT /maintenance/:id`, `POST /maintenance/:id/close`
(R9/R10, txn).

### Fuel & Expenses
`GET/POST /fuel-logs`, `GET/PUT/DELETE /fuel-logs/:id`,
`GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`.

### Dashboard & Reports
`GET /dashboard/kpis?type=&status=&region=`,
`GET /reports/fuel-efficiency`, `GET /reports/utilization`,
`GET /reports/operational-cost`, `GET /reports/roi`,
`GET /reports/export?format=csv&report=`.

---

# 12. Database Design

**Engine:** PostgreSQL — **local** per hackathon rules (no BaaS). ✅ (locked)
**Migrations:** **Prisma Migrate** is the primary migration system. Prisma is a tooling
choice, **not a limitation** — database correctness always wins. Whenever Prisma's
schema DSL cannot express a required PostgreSQL feature, drop **raw SQL into the
generated migration file** for it. This applies to (non-exhaustive): CHECK constraints,
**partial unique indexes**, advanced/partial/expression indexes, generated columns,
triggers, DB functions, exclusion constraints — any feature needed to enforce a
business rule. **The database must never permit invalid data even if the API is
bypassed.**
**Conventions:** `id` BIGSERIAL/UUID PK; `created_at`, `updated_at` on all tables;
soft-delete via status/`deleted_at`; snake_case; FKs `ON DELETE RESTRICT` for master
data referenced by history; enums via native enum or CHECK.

### Audit fields (all tables) 🟦
`created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ`, and where useful
`created_by BIGINT → users.id`, `deleted_at TIMESTAMPTZ NULL`.

### Tables

**roles**(`id` PK, `name` UNIQUE NOT NULL, `description`, `permissions` JSONB 🟨)

**users**(`id` PK, `email` UNIQUE NOT NULL, `password_hash` NOT NULL, `name` NOT NULL,
`role_id` FK→roles NOT NULL, `is_active` BOOL DEFAULT true, `last_login_at`, audit)
- Index: email, role_id.

**vehicles**(`id` PK, `registration_number` UNIQUE NOT NULL, `name_model` NOT NULL,
`type` NOT NULL, `max_load_capacity` NUMERIC CHECK>0, `odometer` NUMERIC CHECK≥0,
`acquisition_cost` NUMERIC CHECK≥0, `status` enum('Available','On Trip','In Shop',
'Retired') DEFAULT 'Available', `region` 🟨, `retired_at`, audit)
- Indexes: status, type, region, registration_number.

**drivers**(`id` PK, `name` NOT NULL, `license_number` NOT NULL UNIQUE 🟨,
`license_category` NOT NULL, `license_expiry_date` DATE NOT NULL, `contact_number`,
`safety_score` NUMERIC CHECK BETWEEN 0 AND 100, `status` enum('Available','On Trip',
'Off Duty','Suspended') DEFAULT 'Available', `user_id` FK→users NULL 🟨, audit)
- Indexes: status, license_expiry_date, license_number.

**trips**(`id` PK, `source` NOT NULL, `destination` NOT NULL, `vehicle_id` FK→vehicles
RESTRICT NOT NULL, `driver_id` FK→drivers RESTRICT NOT NULL, `cargo_weight` NUMERIC
CHECK>0, `planned_distance` NUMERIC CHECK≥0, `status` enum('Draft','Dispatched',
'Completed','Cancelled') DEFAULT 'Draft', `start_odometer` 🟨, `final_odometer`,
`fuel_consumed` 🟦, `revenue` NUMERIC NULL ✅ (captured on completion — §18-F APPROVED),
`dispatched_at`, `completed_at`, `cancelled_at`,
`created_by` FK→users, audit)
- Indexes: status, vehicle_id, driver_id, created_at.
- **Partial unique (race guard, R4):**
  `CREATE UNIQUE INDEX one_active_trip_per_vehicle ON trips(vehicle_id) WHERE status='Dispatched';`
  `CREATE UNIQUE INDEX one_active_trip_per_driver ON trips(driver_id) WHERE status='Dispatched';`

**maintenance_logs**(`id` PK, `vehicle_id` FK→vehicles RESTRICT NOT NULL, `type`,
`description`, `cost` NUMERIC CHECK≥0, `status` enum('Open','Closed') DEFAULT 'Open',
`odometer_at_service` 🟨, `opened_at`, `closed_at`, audit)
- Index: vehicle_id, status.
- **Partial unique (R9):** `... ON maintenance_logs(vehicle_id) WHERE status='Open';`

**fuel_logs**(`id` PK, `vehicle_id` FK→vehicles RESTRICT NOT NULL, `trip_id` FK→trips
NULL, `liters` NUMERIC CHECK>0, `cost` NUMERIC CHECK≥0, `date` DATE NOT NULL,
`odometer` 🟨, `notes`, audit)
- Index: vehicle_id, date, trip_id.

**expenses**(`id` PK, `vehicle_id` FK→vehicles RESTRICT NOT NULL, `trip_id` FK→trips
NULL, `maintenance_id` FK→maintenance_logs NULL, `category` enum('Toll','Fuel',
'Maintenance','Misc') NOT NULL, `amount` NUMERIC CHECK≥0, `date` DATE NOT NULL,
`description`, audit)
- Index: vehicle_id, category, date.

**Cascade/soft-delete strategy:** master data (vehicles, drivers) uses RESTRICT +
soft delete (Retired/deactivated) so history is preserved. Child logs are hard-deletable
by owners to fix data-entry errors. No physical delete cascades from vehicles/drivers.

---

# 13. Dashboard KPIs

> 🟨 Definitions resolve ambiguity in "Active" vs "On Duty"; documented here as the
> canonical formulas.

| KPI | Formula | Dependencies | Refresh |
|-----|---------|--------------|---------|
| **Active Vehicles** | count(vehicles WHERE status='On Trip') | vehicles.status | on load / on mutation |
| **Available Vehicles** | count(vehicles WHERE status='Available') | vehicles.status | " |
| **Vehicles in Maintenance** | count(vehicles WHERE status='In Shop') | vehicles.status | " |
| **Active Trips** | count(trips WHERE status='Dispatched') | trips.status | " |
| **Pending Trips** | count(trips WHERE status='Draft') | trips.status | " |
| **Drivers On Duty** | count(drivers WHERE status IN ('On Trip','Available')) 🟨 | drivers.status | " |
| **Fleet Utilization %** | 100 × onTrip / max(1, total − retired) | vehicles.status | " |

- **Fleet Utilization denominator** excludes Retired vehicles (they aren't part of the
  operating fleet). Guard divide-by-zero with `max(1, …)` or return 0 when no
  operable vehicles.
- **"Drivers On Duty"** 🟨 = drivers currently working (On Trip) or ready (Available).
  If graders expect only active drivers, use `status='On Trip'`. Documented assumption;
  make it a single constant so it's trivially switchable.
- **Filters** (type/status/region) apply to the vehicle-derived KPIs; trip KPIs filter
  by the trip's vehicle attributes where applicable.
- **Refresh strategy:** recompute on page load and after any mutating action; optional
  polling interval (e.g., 30s) or manual refresh; (stretch) websockets for true
  real-time.

---

# 14. Analytics

All formulas guard against divide-by-zero → return `N/A` (never NaN/Infinity).

### Fuel Efficiency = Distance / Fuel 🟥
- **Per vehicle:** Σ(trip distance) / Σ(fuel liters). Distance = Σ planned_distance or
  Σ(final − start odometer) 🟨; Fuel = Σ fuel_logs.liters (and/or trip.fuel_consumed).
- **Dependency:** trips, fuel_logs. **If fuel = 0 → N/A.**

### Fleet Utilization 🟥
- Instantaneous: as §13. Period-based 🟨: Σ(active vehicle-hours) / Σ(available
  vehicle-hours) over a date range, if timestamps allow.

### Operational Cost = Fuel + Maintenance 🟥
- **Per vehicle:** Σ fuel_logs.cost + Σ maintenance_logs.cost (+Σ non-fuel expenses 🟨).
- Single source of truth for maintenance cost = `maintenance_logs.cost` (avoid
  double-counting with an Expense of category Maintenance — §18-E).

### Vehicle ROI = (Revenue − (Fuel + Maintenance)) / Acquisition Cost 🟥
- **Numerator:** Revenue − (Σ fuel cost + Σ maintenance cost).
- **Denominator:** vehicle.acquisition_cost. **If 0 → N/A.**
- **Revenue source (✅ §18-F Option A, APPROVED):** `trips.revenue`, captured at trip
  completion. **Vehicle Revenue = Σ `revenue` of that vehicle's Completed trips**
  (null revenue contributes 0). This is the documented engineering assumption resolving
  the PDF's missing revenue source — the model change is locked, so Analytics can ship.

### Export
- **CSV (mandatory):** each report exportable; server streams CSV with headers.
- **PDF (bonus):** render report to PDF.

---

# 15. Edge Cases

Grouped by area; each is a concrete scenario to test.

**Concurrency / races**
1. Two users dispatch the **same vehicle** simultaneously → only one succeeds (row lock
   + partial-unique index); loser gets 409. (R4)
2. Two users dispatch the **same driver** to different vehicles simultaneously → one
   wins.
3. Dispatch while another user retires the same vehicle → transaction ordering; retire
   blocked if vehicle becomes On Trip, or dispatch blocked if retired first.
4. Complete + cancel the same trip at once → second transition rejected (terminal).

**Vehicle lifecycle**
5. Retire a vehicle that is currently `On Trip` → blocked; must complete/cancel trip
   first (§7.1).
6. Open maintenance on an `On Trip` vehicle → blocked (§18-D).
7. Edit a vehicle's capacity **below** the cargo of its in-progress dispatched trip →
   allowed for future, but must not retroactively invalidate the live trip; re-validate
   on next dispatch only.
8. Negative or decreasing odometer on completion → rejected (R11).
9. Two `Open` maintenance records for one vehicle → blocked (partial unique).
10. Closing maintenance for a `Retired` vehicle → stays Retired (R10).

**Driver lifecycle**
11. License expires **today** → boundary: eligible if `expiry >= today` (inclusive) 🟨,
    ineligible the following day. Define inclusivity explicitly.
12. Suspend a driver who is `On Trip` → block, or force-cancel the trip first (§7.2).
13. Safety score set to 150 or −5 → rejected (0–100).
14. Duplicate license number → rejected (R17).
15. Dispatch a driver whose license expires **during** the trip → allowed at dispatch
    (valid today) but flag/warn 🟨.

**Trip logic**
16. Cargo exactly equals capacity (500 == 500) → allowed (R5, boundary).
17. Cargo 0 or negative → rejected (>0).
18. Dispatch a Draft whose vehicle was retired after draft creation → re-validation at
    dispatch rejects it (R13).
19. Complete an already-Completed trip → rejected (terminal).
20. Cancel a Completed trip → rejected.
21. Create a trip with the same vehicle as driver's… (N/A—different entities) but same
    vehicle in two Draft trips is fine; only Dispatched is exclusive.
22. Planned distance 0 with fuel consumed > 0 → efficiency 0 (or N/A) — handle.

**Financial / analytics**
23. Fuel efficiency when Σfuel = 0 → N/A.
24. ROI when acquisition_cost = 0 → N/A.
25. ROI when Revenue undefined → cannot compute (§18-F).
26. Maintenance cost counted twice (log + expense) → dedupe (§18-E).
27. Fuel log dated in the future → rejected 🟨.

**Transactional integrity**
28. Dispatch: trip saved but driver flip fails → whole transaction rolls back (no
    partial On Trip). (R6)
29. Maintenance open: vehicle→In Shop succeeds but insert fails → rollback (R9).
30. DB connection drops mid-transaction → rollback; client sees 500, no partial state.

**Auth / access**
31. Expired token mid-session → 401, redirect to login.
32. Driver calls a Fleet-Manager-only endpoint directly → 403.
33. Mass-assignment: client posts `status` on trip create → ignored/stripped (§16).
34. SQL injection via search param → parameterized queries neutralize.

**Empty / boundary data**
35. Dashboard with zero vehicles → all KPIs 0, utilization 0 (no divide-by-zero).
36. Reports with no trips → all N/A, empty export with headers.
37. Pagination beyond last page → empty list, not error.

---

# 16. Security Analysis

- **Authentication:** email+password; passwords hashed with bcrypt/argon2 (never
  plaintext); JWT or server session; login rate-limiting 🟨; generic error to prevent
  user enumeration.
- **Authorization / RBAC:** every endpoint guarded by role (§3 matrix); enforce on the
  **server**, never trust the client; deny-by-default.
- **Broken access control:** object-level checks (a Driver can only complete trips they
  are permitted to; users can only edit self). Test cross-role access to every route.
- **Input validation:** validate & sanitize all inputs at the API boundary (types,
  ranges, enums); reject unknown fields.
- **Injection:** use parameterized queries / ORM bindings exclusively; never string-
  concatenate SQL; sanitize search/sort inputs (whitelist sortable columns).
- **Mass assignment:** whitelist writable fields per endpoint; never bind `status`,
  `role_id`, `id`, cost totals directly from request body.
- **Audit logs 🟦:** record who created/updated critical records and every status
  transition (created_by/updated_by + optional `audit_log` table) — supports the
  "attention to detail" and traceability criteria.
- **Transport:** HTTPS in deployment; secure/httpOnly cookies if session-based; CORS
  locked to the frontend origin.
- **Secrets:** DB creds & JWT secret in env vars, never committed (respect .gitignore).
- **Data integrity as security:** the transactional status rules (R6–R10) prevent
  inconsistent states that could be exploited operationally.

---

# 17. Performance Considerations

- **Indexes:** on every FK and every status/filter column (§12) — dashboard and
  dispatch pools filter by status constantly.
- **Pagination:** all list endpoints paginated (`page`/`limit`, default limit e.g. 20);
  never return unbounded lists.
- **Filtering & search:** server-side; whitelist filter/sort fields; index search
  columns (reg no, license no, name).
- **Aggregation:** dashboard KPIs via `COUNT ... GROUP BY status` in a single query
  where possible; consider a cached/materialized summary if fleet is large 🟨.
- **Dashboard optimization:** compute all seven KPIs in as few queries as possible;
  avoid N+1 by aggregating, not looping.
- **Reports:** compute with SQL aggregates (SUM/GROUP BY), not app-side loops; stream
  CSV export.
- **Connection pooling** for the DB; transactions kept short (lock only during
  dispatch/complete/cancel critical section).
- **Avoid N+1** in list views (join vehicle/driver names, don't per-row fetch).

---

# 18. Missing Requirements & Assumptions

Each is a gap in the PDF with a documented decision. **These are labeled assumptions/
recommendations, not invented requirements.**

- **§18-A — Who dispatches?** §2 says *Driver* creates/assigns trips, which is unusual.
  **Decision:** allow both **Driver and Fleet Manager** to create/dispatch trips (RBAC
  permits both). Grading needs RBAC to exist; this satisfies both readings.
- **§18-B — User↔Driver link.** Are drivers also login users? PDF separates `Users` and
  `Drivers`. **Decision:** keep separate tables; add optional nullable `drivers.user_id`
  so a driver *can* have a login without forcing it.
- **§18-C — Region field.** Dashboard filters by "region" but no entity has region.
  **Decision:** add `region` to `vehicles` (and expose as a filter). Assumption.
- **§18-D — Maintenance on an On-Trip vehicle.** PDF doesn't say. **Decision:** block
  opening maintenance while the vehicle is `On Trip`; require the trip to be
  completed/cancelled first. Prevents an impossible dual state.
- **§18-E — Maintenance cost source of truth.** Maintenance cost could live in
  `maintenance_logs.cost` *and* as an Expense(category=Maintenance). **Decision:**
  `maintenance_logs.cost` is authoritative for Operational Cost & ROI; do **not** also
  add a Maintenance expense row for the same event (or explicitly exclude it from the
  sum) to avoid double counting.
- **§18-F — Revenue for ROI. ✅ APPROVED — Option A (locked 2026-07-12).**
  - **The gap:** §3.8 mandates `Vehicle ROI = (Revenue − (Maintenance + Fuel)) /
    Acquisition Cost`, but the PDF defines **no revenue/fare/price field on any of the
    8 entities**. Maintenance (`Σ maintenance_logs.cost`), Fuel (`Σ fuel_logs.cost`),
    and Acquisition Cost (`vehicles.acquisition_cost`) are all derivable; **Revenue is
    not.** As specified, ROI is uncomputable.
  - **Decision:** Add a nullable `revenue` field to the **Trip** entity, captured at
    **trip completion** (alongside final odometer and fuel, in the same completion
    workflow — §8.4). Then:
    - **Vehicle Revenue** = Σ `revenue` of that vehicle's **Completed** trips.
    - **ROI** = `(Revenue − (Fuel Cost + Maintenance Cost)) / Acquisition Cost`.
    - If a completed trip has null revenue it contributes 0; if acquisition_cost = 0 →
      ROI is `N/A` (never NaN/Infinity).
  - **Why this assumption was required:** the problem statement *mandates* ROI as one
    of four analytics metrics but provides no revenue source. Silently omitting ROI
    would drop a mandatory requirement; silently inventing a hidden revenue value would
    violate the "never invent requirements" rule. A documented, reviewable assumption is
    the only correct path.
  - **Why this is the smallest possible extension preserving original business intent:**
    - It adds exactly **one nullable column** to one existing table (`trips.revenue`) —
      no new entities, no new tables, no new relationships.
    - It reuses the **existing** trip-completion workflow as the capture point (no new
      screen, one extra input field).
    - Per-trip revenue is the natural grain of "money a vehicle earned," so it
      preserves the original intent of ROI (profitability per asset) without reshaping
      the model. Alternatives (a separate revenue ledger / income entity) add tables and
      coupling for no added accuracy at this scope.
  - **Traceability:** mirrored in `checklist.md` (Phase 4 schema + Phase 8 analytics) as
    an explicitly marked assumption so it is never lost.
- **§18-G — Fuel consumed on completion.** §5 workflow Step 6 says "enter final
  odometer and fuel consumed," so completion must capture `fuel_consumed`. **Decision:**
  require it (or create a linked fuel log) so fuel efficiency has data.
- **§18-H — License-expiry inclusivity.** "Expired" = `expiry < today`; a license
  expiring today is still valid today. **Decision:** eligible iff `expiry >= today`.
- **§18-I — Soft delete.** PDF says "CRUD" incl. delete but data is referenced by
  history. **Decision:** vehicles→Retire, drivers→deactivate (soft delete); child logs
  hard-deletable.
- **§18-J — Reg-no normalization.** **Decision:** trim + uppercase reg no before
  uniqueness check to avoid case/whitespace duplicates.
- **§18-K — Real-time data.** Hackathon requires real-time/dynamic data (not static
  JSON). **Decision:** all reads hit the live DB; dashboard recomputes on mutation;
  optional polling. No hardcoded JSON in production paths.
- **§18-L — Tech stack.** Local DB (Postgres/MySQL), no BaaS. **Recommendation:** a
  from-scratch REST backend + relational DB + responsive SPA; minimal third-party libs
  per hackathon "build from scratch" guidance. (Final stack is a team decision recorded
  in the checklist.)
- **§18-M — Timezones/dates.** Store timestamps in UTC; compare license expiry against
  server date (today = 2026-07-12 at time of writing).
- **§18-N — Trip start odometer.** To compute per-trip distance from odometer, capture
  `start_odometer` at dispatch (= vehicle odometer then). Assumption to enable R11 &
  efficiency.

---

# 19. Development Phases

Ordered by dependency; each phase is independently demoable. Maps to checklist.md.

### Phase 0 — Foundation
Repo scaffolding, local Postgres/MySQL, migrations tooling, env/config, base API
server, error-handling middleware, base responsive UI shell + routing/layout.

### Phase 1 — Auth & RBAC & Users/Roles
Roles seed (Admin, Fleet Manager, Driver, Safety Officer, Financial Analyst), Users,
password hashing, login/logout/me, JWT/session, RBAC middleware, protected routes,
login UI, unauthorized/session states.

### Phase 2 — Vehicle Registry (CRUD)
vehicles table + migration + model, validation (R1, R11, R14), CRUD APIs, search/
filter/sort/pagination, list/detail/form UI, retire (soft delete), available pool.

### Phase 3 — Driver Management (CRUD)
drivers table + validation (R3 fields, R14, R17), CRUD APIs, eligible pool,
suspend/reinstate, license badge, list/detail/form UI.

### Phase 4 — Trip Management + automatic status transitions
trips table + partial-unique indexes, create Draft, eligible-only pickers, capacity
check (R5), dispatch/complete/cancel transactions (R6–R8), monotonic odometer (R11),
race handling (§15), trip UI + action dialogs.

### Phase 5 — Maintenance workflow
maintenance_logs table + partial unique, create (R9 In Shop), close (R10 restore),
block on On-Trip (§18-D), transactional, UI.

### Phase 6 — Fuel & Expense
fuel_logs + expenses tables, CRUD, validation (R14, dates), per-vehicle operational
cost, UI.

### Phase 7 — Dashboard KPIs
KPI aggregation endpoint (§13), filters (type/status/region), tiles UI, empty/loading/
error states, refresh strategy.

### Phase 8 — Reports & Analytics
Fuel efficiency, utilization, operational cost, ROI (§14) with divide-by-zero guards
and revenue field (§18-F), CSV export, report UI.

### Phase 9 — Bonus (time permitting)
Charts, PDF export, expiring-license email reminders, vehicle document management,
advanced search/sort, dark mode.

### Phase 10 — Hardening & Demo
Security pass (§16), performance/index pass (§17), edge-case tests (§15), seed demo
data, rehearse workflow (§5 example), CSV export check, cross-role RBAC check.

---

# 20. Final Engineering Checklist

Nothing below should be ambiguous. (Tracked live in `docs/checklist.md`.)

**Data & DB (highest weight)**
- [ ] All 8 entities modeled with the fields in §6 and constraints in §12.
- [ ] Unique: vehicle reg no (normalized), user email, role name, driver license 🟨.
- [ ] CHECK: capacity>0, liters>0, cargo>0, all money/score ≥0, score ≤100, enums.
- [ ] Partial unique: one Dispatched trip per vehicle & per driver; one Open
      maintenance per vehicle.
- [ ] FKs RESTRICT + soft delete for masters; audit fields on every table.
- [ ] Indexes on all FKs + status/type/region/date/search columns.

**Business rules (R1–R18)**
- [ ] Every rule enforced at BE (source of truth) + surfaced at FE + constrained at DB
      where possible.
- [ ] All status transitions validated against §7 machines; invalid transitions rejected.
- [ ] Dispatch/complete/cancel and maintenance open/close are **transactional**.
- [ ] Race protection on dispatch (row lock + partial unique) verified with §15 tests.

**APIs (§11)**
- [ ] Every listed endpoint implemented with correct codes, auth, validation.
- [ ] Pagination/filter/search/sort on all lists; whitelisted sort fields.
- [ ] Consistent error envelope; input validation everywhere.

**Frontend (§10)**
- [ ] Every screen built, responsive, consistent theme/navigation.
- [ ] Loading, empty, error, and no-permission states on every data view.
- [ ] Eligible-only pickers; live capacity check; action confirm dialogs.

**Dashboard & Analytics (§13–14)**
- [ ] 7 KPIs with exact formulas; filters; no divide-by-zero.
- [ ] 4 analytics metrics with N/A guards; Revenue resolved (§18-F); CSV export works.

**Security (§16)**
- [ ] Hashed passwords, RBAC enforced server-side, parameterized queries, mass-
      assignment whitelist, secrets in env, generic auth errors.

**Quality**
- [ ] Modular architecture; clean, consistent code; minimal third-party deps.
- [ ] Input validation with graceful, specific error feedback (e.g., invalid email).
- [ ] Real-time/dynamic data (no static JSON in production paths).
- [ ] Seed data + the §5 example workflow runs end-to-end in the demo.
- [ ] Every team member has meaningful Git commits (teamwork criterion).

---

*End of problem.md — the single source of truth. Amend here first, then code.*
