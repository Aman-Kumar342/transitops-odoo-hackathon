# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform that digitizes vehicle, driver, dispatch,
maintenance, and expense management — enforcing operational business rules and surfacing
real-time operational insight. Built for the **Odoo Hackathon 2026**.

> Replaces spreadsheets and manual logbooks with a single, rule-enforcing system that
> prevents scheduling conflicts, overloading, expired-license dispatch, and blind spots
> in cost and utilization.

**🔗 Links**
- **🚀 Live demo:** **http://69.62.76.226:3001** — open it and use the whole app (no install).
- **Repository:** https://github.com/Aman-Kumar342/transitops-odoo-hackathon
- **Design mockup (Excalidraw):** https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td

---

## 🚀 Live demo

Open **http://69.62.76.226:3001** in any browser and sign in — no setup required.

| Role | Email | Password |
|------|-------|----------|
| **Admin** (full access) | `admin@transitops.local` | `Transitops2026` |
| Fleet Manager | `fleet@transitops.local` | `Transitops2026` |
| Driver | `driver@transitops.local` | `Transitops2026` |
| Safety Officer | `safety@transitops.local` | `Transitops2026` |
| Financial Analyst | `finance@transitops.local` | `Transitops2026` |

Each role sees a different app (the sidebar is filtered by RBAC). Sign in as **Admin** to do
everything. It's a shared demo, so the data may be changed by others — it can be reset from
the seed at any time.

> Notes: the demo is served over plain HTTP (an IP:port has no TLS certificate), so the
> browser may show "Not secure" — that's expected for a demo link. The app runs on the
> team's VPS under pm2, talking to a local PostgreSQL database on the same server.

---

## Status

🟢 **All 8 mandatory deliverables implemented and verified against a live database.**

Responsive UI · Auth + RBAC · CRUD for Vehicles & Drivers · Trip Management with
validations · Automatic status transitions · Maintenance workflow · Fuel & Expense
tracking · Dashboard with KPIs — **plus** Reports & Analytics (Fuel Efficiency, Fleet
Utilization, Operational Cost, Vehicle ROI) with CSV export, and bonus features
(dark mode, in-app expiring-license reminders, charts).

This repository is **documentation-driven**: the specification and roadmap were written
and reviewed *before* the code. See [`docs/`](#documentation) — and
[`docs/demo.md`](docs/demo.md) for how to run and present it.

---

## Documentation

Read these before touching any code — in this order:

| Doc | Purpose |
|-----|---------|
| [`docs/problem.md`](docs/problem.md) | **Single source of truth** — full system analysis: modules, business rules (R1–R18), entities, status machines, workflows, APIs, DB schema, KPIs, analytics, edge cases, security, assumptions. |
| [`docs/checklist.md`](docs/checklist.md) | **Living implementation tracker** — phased tasks with progress %, decisions, and traceable engineering assumptions. |
| [`docs/guidelines.md`](docs/guidelines.md) | **Engineering handbook** — how this repo is developed (source-of-truth priority, mandatory workflow, business-rule enforcement, definition of done). |
| [`docs/demo.md`](docs/demo.md) | **Demo & verification guide** — run steps, login accounts, seeded story, live demo script, verification results. |
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

## Run it (2 minutes)

**Prerequisites:** Node.js 20+, and a **local PostgreSQL 14+** running (no cloud/BaaS,
per the hackathon rules). Create an empty database first, e.g. `createdb transitops`.

```bash
# 1. Clone and install
git clone https://github.com/Aman-Kumar342/transitops-odoo-hackathon.git
cd transitops-odoo-hackathon
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env and set:
#    DATABASE_URL   -> your local Postgres, e.g. postgresql://USER:PASS@localhost:5432/transitops?schema=public
#    JWT_SECRET     -> any 32+ char random string (openssl rand -base64 48)
#    ADMIN_EMAIL / ADMIN_PASSWORD  -> the initial admin login you want
#    DEMO_PASSWORD  -> shared password for the demo role accounts

# 3. Create the schema + seed data
npx prisma migrate deploy   # apply migrations   (use `prisma migrate dev` in development)
npm run seed                # roles + admin + one demo user per role
npm run seed:demo           # a realistic demo fleet (vehicles, drivers, trips, costs)

# 4. Start
npm run dev                 # open http://localhost:3000
```

The app opens at **http://localhost:3000** and redirects to the login.

### Login accounts

Passwords are whatever **you** set in `.env` (they are never committed). After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin (full access) | `admin@transitops.local` | your `ADMIN_PASSWORD` |
| Fleet Manager | `fleet@transitops.local` | your `DEMO_PASSWORD` |
| Driver | `driver@transitops.local` | your `DEMO_PASSWORD` |
| Safety Officer | `safety@transitops.local` | your `DEMO_PASSWORD` |
| Financial Analyst | `finance@transitops.local` | your `DEMO_PASSWORD` |

Each role sees a different app (the sidebar is filtered by RBAC). Full walkthrough and a
guided demo script are in [`docs/demo.md`](docs/demo.md).

---

## Team & Workflow

- Version control is a team effort — every member contributes meaningful commits.
- Work strictly by phase; no jumping ahead (see `docs/guidelines.md` §6).
- Documentation is the source of truth: if code and docs conflict, update the docs
  first, then the code.

## Links

- **Repository:** https://github.com/Aman-Kumar342/transitops-odoo-hackathon
- **Design mockup (Excalidraw):** https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td
- [Odoo Hackathon 2026](https://hackathon.odoo.com/)
