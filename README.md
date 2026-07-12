# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform that digitizes vehicle, driver, dispatch,
maintenance, and expense management — enforcing operational business rules and surfacing
real-time operational insight. Built for the **Odoo Hackathon 2026**.

> Replaces spreadsheets and manual logbooks with a single, rule-enforcing system that
> prevents scheduling conflicts, overloading, expired-license dispatch, and blind spots
> in cost and utilization.

---

## Status

🟡 **Pre-implementation — documentation phase complete, awaiting Phase 0 kickoff.**

This repository is **documentation-driven**: the specification and roadmap are written
and reviewed *before* any production code. See [`docs/`](#documentation).

---

## Documentation

Read these before touching any code — in this order:

| Doc | Purpose |
|-----|---------|
| [`docs/problem.md`](docs/problem.md) | **Single source of truth** — full system analysis: modules, business rules (R1–R18), entities, status machines, workflows, APIs, DB schema, KPIs, analytics, edge cases, security, assumptions. |
| [`docs/checklist.md`](docs/checklist.md) | **Living implementation tracker** — phased tasks with progress %, decisions, and traceable engineering assumptions. |
| [`docs/guidelines.md`](docs/guidelines.md) | **Engineering handbook** — how this repo is developed (source-of-truth priority, mandatory workflow, business-rule enforcement, definition of done). |
| [`expectation.md`](expectation.md) | Evaluator's coding standards and evaluation criteria. |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js (App Router)** — UI + API in one codebase |
| ORM / Migrations | **Prisma** + Prisma Migrate (raw SQL in migrations where Postgres features require it) |
| Database | **Local PostgreSQL** (no BaaS, per hackathon rules) |
| Auth | Email + password, hashed; JWT/session; **RBAC** |
| Language | TypeScript |

**Architecture (strict layering):**

```
Next.js App Router
   └─ Route Handlers      → orchestration only, no business logic
        └─ Service Layer   → single source of truth for business rules,
        │                    status transitions, analytics
        └─ Repository Layer → Prisma / DB access only, no business logic
             └─ PostgreSQL  → constraints enforce rules even if the API is bypassed
```

Business rules are enforced at **every** applicable layer: UI validation → API
validation → Service validation → Database constraints.

---

## Core Domain

**Roles:** Fleet Manager · Driver · Safety Officer · Financial Analyst (+ implied Admin).

**Entities:** Users · Roles · Vehicles · Drivers · Trips · Maintenance Logs · Fuel Logs
· Expenses.

**Key business rules (excerpt — full list in `docs/problem.md` §5):**
- Vehicle registration number is unique.
- Retired / In-Shop vehicles never appear in dispatch selection.
- Drivers with expired licenses or Suspended status cannot be assigned to trips.
- A vehicle/driver already On Trip cannot be assigned to another trip.
- Cargo weight must not exceed the vehicle's maximum load capacity.
- Dispatch / Complete / Cancel automatically transition vehicle & driver status
  (transactional, race-safe).
- Opening maintenance sets a vehicle to In Shop; closing restores it (unless Retired).

**Analytics:** Fuel Efficiency (Distance/Fuel) · Fleet Utilization · Operational Cost
(Fuel + Maintenance) · Vehicle ROI = `(Revenue − (Fuel + Maintenance)) / Acquisition Cost`.

> **Note:** the problem statement mandates ROI but defines no revenue source. Per the
> documented engineering assumption **§18-F**, `revenue` is captured per trip at
> completion; Vehicle Revenue = sum of revenue across a vehicle's completed trips.

---

## Development Phases

| Phase | Scope |
|------:|-------|
| 0 | Foundation — scaffolding, DB, migrations, base UI shell |
| 1 | Auth, RBAC, Users/Roles |
| 2 | Vehicle Registry (CRUD) |
| 3 | Driver Management (CRUD) |
| 4 | Trip Management + automatic status transitions |
| 5 | Maintenance workflow |
| 6 | Fuel & Expense management |
| 7 | Dashboard KPIs |
| 8 | Reports & Analytics (+ CSV export) |
| 9 | Bonus (charts, PDF export, license reminders, dark mode, …) |
| 10 | Hardening & demo |

Track live progress in [`docs/checklist.md`](docs/checklist.md).

---

## Getting Started

> ⚠️ Setup steps below are the **planned** flow for Phase 0. The application is not yet
> scaffolded. This section will be finalized when Phase 0 lands.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy and fill in DATABASE_URL, JWT secret, etc.)
cp .env.example .env

# 3. Provision the database (local PostgreSQL)
npx prisma migrate dev

# 4. Seed roles + demo data
npm run seed

# 5. Run the app
npm run dev
```

---

## Team & Workflow

- Version control is a team effort — every member contributes meaningful commits.
- Work strictly by phase; no jumping ahead (see `docs/guidelines.md` §6).
- Documentation is the source of truth: if code and docs conflict, update the docs
  first, then the code.

## Links

- [Odoo Hackathon 2026](https://hackathon.odoo.com/)
- Mockup: https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td
