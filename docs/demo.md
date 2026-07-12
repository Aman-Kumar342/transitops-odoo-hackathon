# TransitOps — Demo & Verification

This is the presenter's guide: how to run the demo, the login accounts, the story in
the seeded data, and the results of the final verification pass.

---

## 1. Run it

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, ADMIN_*, DEMO_PASSWORD
npx prisma migrate deploy     # apply migrations
npm run seed                  # roles + admin + demo users
npm run seed:demo             # coherent demo fleet dataset
npm run dev                   # http://localhost:3000
```

> The database runs on a **local PostgreSQL** (no BaaS). In this build it lives on the
> team VPS in an isolated `transitops` database, reached over an SSH tunnel on local port
> `55432` — see `.env`.

## 2. Login accounts

Passwords are **not** committed. They live in `.env`:
- Admin: `admin@transitops.local` — password `ADMIN_PASSWORD`
- Demo users (password `DEMO_PASSWORD`): `fleet@`, `driver@`, `safety@`, `finance@transitops.local`

Each role sees a different app (nav is filtered by RBAC): e.g. Driver can create/dispatch
trips but not manage the fleet; Financial Analyst sees Fuel & Expenses + Analytics;
Safety Officer manages Drivers.

## 3. The seeded story (`npm run seed:demo`)

- **7 vehicles** across every status: VAN-05 (Available), TRUCK-11 (On Trip), MINI-03
  (In Shop), VAN-09 (Retired), plus TRUCK-04 / MINI-08 / TRK-12.
- **5 drivers**: Alex (Available), John (Suspended, license expired), Priya (On Trip),
  Suresh (Off Duty), Ravi (Available, license expiring in ~20 days).
- **5 trips**: one Completed (VAN-05 + Alex, revenue captured), one Dispatched
  (TRUCK-11 + Priya), one Draft, one Cancelled, one older Completed (TRK-12).
- **3 maintenance records**, **5 fuel logs**, **4 expenses** — so operational cost and
  ROI are populated.

This makes the **Dashboard** and **Analytics** screens look real out of the box, and it
demonstrates the expiring-license reminder (John + Ravi) immediately.

## 4. Live demo script (the §5 example workflow)

1. **Dashboard** — point out the 7 KPI tiles, filters, Recent Trips, and Vehicle Status
   legend updating from live data.
2. **Fleet** — show VAN-05; note Registration No. is unique and Retired/In-Shop vehicles
   are hidden from dispatch.
3. **Trips → New trip** — source/destination, pick VAN-05 (available only) and Alex
   (eligible only), enter cargo **450 kg**. Try **700 kg** to show the live "capacity
   exceeded" block (R5).
4. **Dispatch** — VAN-05 and Alex flip to **On Trip** (R6); both disappear from the pools.
5. **Complete** — enter final odometer + fuel + revenue; both return to **Available**
   (R7); revenue feeds ROI.
6. **Maintenance** — open a record on a vehicle → it goes **In Shop** and leaves the
   dispatch pool (R9); close it → back to **Available** (R10).
7. **Analytics** — Fuel Efficiency / Utilization / Operational Cost / ROI, then
   **Export CSV**.
8. **Toggle dark mode** and open the **Drivers** page to show the expiring-license alert.

## 5. Verification results (final pass)

All checks run against the live DB.

**Business rules / workflow**
- §5 example workflow (Van-05 / Alex / 450 kg): Draft → Dispatch (both On Trip) →
  Complete (both Available) — ✅ verified end-to-end.
- Cargo > capacity (R5) → 422; odometer decrease (R11) → 422; retire On-Trip vehicle
  blocked; concurrent double-dispatch (R4) → exactly one wins.
- Maintenance open → In Shop (R9); close → Available unless Retired (R10); On-Trip open
  blocked (§18-D).

**RBAC (cross-role sweep)** — no permission leaks:
| Action | Admin | Fleet Mgr | Driver | Safety | Financial |
|--------|:-----:|:---------:|:------:|:------:|:---------:|
| vehicle.create | ✅ | ✅ | 403 | 403 | 403 |
| driver.create | ✅ | 403 | 403 | ✅ | 403 |
| maintenance.read | ✅ | ✅ | 403 | 403 | ✅ |
| expenses.read | ✅ | ✅ | 403 | 403 | ✅ |

Unauthenticated request → 401. (Values marked ✅ returned 200/201, or 409 when a
duplicate already existed — both confirm the permission was granted.)

**Security**
- Passwords stored bcrypt-hashed (`$2a$…`); generic invalid-credentials error (no user
  enumeration).
- `.env` is gitignored and untracked (verified); secrets never committed.
- Parameterized queries throughout (Prisma); mass-assignment guarded (whitelisted
  fields per endpoint); auth enforced server-side (middleware + guards).

**Performance / DB design**
- Index audit: trips 7 (incl. partial-unique race guards), vehicles 5, drivers 5,
  fuel_logs 4, expenses 4, maintenance_logs 4, users 3 — every FK and filter/status
  column indexed.
- DB-level CHECK constraints and partial-unique indexes reject invalid data even when the
  API is bypassed (verified with direct SQL inserts throughout).
- All list endpoints paginated; KPIs/analytics computed with SQL aggregates (no N+1).

**Data**
- Real-time/dynamic data only (all reads hit the live DB; no static JSON in prod paths).
- Mandatory CSV export returns `text/csv` with an attachment header.
