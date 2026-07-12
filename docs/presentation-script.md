# TransitOps — Live Demo Script (presentation guide)

A step-by-step walkthrough for judging. Total time **~8–9 minutes**. Every step says
**where to click**, **what to do**, and **what to say** (the "say" lines are what earns
points — they map to the judging criteria).

- **Live app:** http://69.62.76.226:3001
- **Login:** `admin@transitops.local` / `Transitops2026` (all role accounts use the same
  password; see the table at the bottom)

### Before you start (setup, 1 min before presenting)
1. Open **two browser windows** side by side (or one normal + one Incognito). You'll use
   the second one for the RBAC and race-condition moments.
2. In window 1, open the live URL. Leave it on the login screen.
3. Have the repo open in a tab too: https://github.com/Aman-Kumar342/transitops-odoo-hackathon
4. Know your opening line and who presents which part (every teammate should speak).

---

## 0. Login & the pitch  (~40s)
- **Where:** the login screen (http://69.62.76.226:3001).
- **Do:** Point at the split-panel login. Type the admin email + `Transitops2026`, click **Sign in**.
- **Say:** "TransitOps replaces spreadsheets and manual logbooks for a transport fleet.
  One login, **four roles** with **role-based access control**. Everything you'll see is
  **real-time data from a PostgreSQL database** — no static JSON."

## 1. Dashboard — the control tower  (~1 min)
- **Where:** you land on the Dashboard.
- **Do:** Sweep your hand across the **7 KPI tiles**. Change the **Vehicle Type** or
  **Region** filter and show the numbers update. Point at **Recent Trips** and the
  **Vehicle Status** legend.
- **Say:** "Seven live KPIs — active/available/in-maintenance vehicles, active and pending
  trips, drivers on duty, and **fleet utilization**, all computed with **SQL aggregate
  queries** (no N+1). Filters scope the whole board."
- **Wow:** click the **🌙 / ☀️ toggle** (top right) → full **dark mode**. "Theme-aware,
  persisted, no flash."

## 2. Fleet (Vehicle Registry) — database design  (~1 min)
- **Where:** sidebar → **Fleet**.
- **Do:** Show the table (Reg No, Type, Capacity, Odometer, Acq. Cost, Status). Click a
  vehicle (e.g. **VAN-05**) → show the **Operational Cost card** (Fuel + Maintenance).
- **Do:** Back to Fleet → **+ New vehicle**. Type a registration number that already
  exists → on blur it flags **"Already registered"**. Enter capacity `0` → validation
  error.
- **Say (the key DB-design line):** "Uniqueness, capacity, odometer, and the vehicle-type
  set are enforced at **three layers** — the form, the API, and **the database itself
  with CHECK constraints and unique indexes**. So the database **rejects invalid data
  even if the API is bypassed**. Database design was the highest-weighted criterion, so
  we leaned into it."

## 3. Drivers & Safety — compliance  (~50s)
- **Where:** sidebar → **Drivers**.
- **Do:** Point at the **license badges** (green = valid, red = **Expired**), the **safety
  scores**, and the **Trip Compl.** column. Point at the **amber warning banner** at the
  top: "N drivers with licenses expiring soon or expired."
- **Do:** Open a driver → click **Suspend**, then **Reinstate**.
- **Say:** "The Safety Officer owns compliance. A driver with an **expired license or a
  Suspended status is automatically blocked from dispatch** — you'll see that enforced in
  the next screen. The expiring-license reminder is our bonus safety feature."

## 4. Trip Management — the centerpiece  (~2.5 min)
This is the heart of the app. Slow down here.

- **Where:** sidebar → **Trips** → **+ New trip**.
- **Do:** Source `Gandhinagar Depot`, Destination `Ahmedabad Hub`. Open the **Vehicle**
  dropdown — **"available only"**; open the **Driver** dropdown — **"eligible only"**.
  Pick **VAN-05** (capacity 500) and **Alex**.
- **Do (WOW #1 — the live rule):** Type cargo **700** → instant red
  **"Exceeds capacity of 500 kg"**. **Say:** "Cargo can never exceed the vehicle's
  capacity — validated live, and again on the server."
- **Do:** Change cargo to **450** → **Create trip (Draft)**.
- **Do:** On the trip detail, point at the **lifecycle stepper** (Draft → Dispatched →
  Completed). Click **Dispatch**.
- **Do:** Go to **Fleet** — VAN-05 is now **On Trip**; go to **Drivers** — Alex is **On
  Trip**. Both have **disappeared from the available pools**.
- **Say:** "Dispatch is **transactional** — the trip, the vehicle, and the driver all flip
  to On Trip **atomically**, with database row locks. There's no half-state."
- **Do (WOW #2 — the race guard, optional but powerful):** In your **second window**
  (also logged in), create another Draft for the **same** vehicle+driver, and try to
  dispatch it. It's **rejected** ("just dispatched to another trip").
- **Say:** "Two dispatchers can't double-book the same vehicle. We enforce it with
  **partial unique indexes** in Postgres — at most one *Dispatched* trip per vehicle and
  per driver — so even a race between two users can't break it."
- **Do:** Back on the first trip → **Complete** → enter final odometer, fuel, and
  **revenue** → submit. VAN-05 and Alex are **Available** again; the odometer advanced.
- **Say:** "On completion we capture odometer, fuel, and **revenue** — which feeds ROI in
  Analytics."

## 5. Maintenance  (~45s)
- **Where:** sidebar → **Maintenance**.
- **Do:** Point at the **workflow strip** (Available → In Shop → Available). Click
  **+ New record**, pick an **available** vehicle, save. Open **Fleet** → that vehicle is
  now **In Shop** and **gone from the dispatch pool**. Back → **Close** the record → it
  returns to **Available**.
- **Say:** "Opening a service record sends the vehicle **In Shop** and hides it from
  dispatch; closing restores it. And you **can't** service a vehicle that's mid-trip —
  the rule blocks it."

## 6. Fuel & Expenses  (~30s)
- **Where:** sidebar → **Fuel & Expenses**.
- **Do:** Point at the **Total Operational Cost (auto = Fuel + Maintenance)** strip at
  the top. Click **+ Log fuel**, add one, save.
- **Say:** "Operational cost is computed automatically as **Fuel + Maintenance** per
  vehicle. Fuel and Maintenance each have their own table — the **single source of
  truth** — so nothing is double-counted."

## 7. Analytics & CSV export  (~1 min)
- **Where:** sidebar → **Analytics**.
- **Do:** Show the four cards — **Fuel Efficiency, Fleet Utilization, Operational Cost,
  Vehicle ROI** — and read the **ROI formula** under them. Point at the **Monthly Revenue**
  chart and **Top Costliest Vehicles**.
- **Do:** Click **Export CSV** → the file downloads.
- **Say:** "Fuel efficiency, utilization, operational cost, and **ROI = (Revenue −
  (Maintenance + Fuel)) / Acquisition Cost**. The problem statement mandated ROI but
  never defined *revenue* — we documented that gap and added a revenue field captured on
  trip completion. CSV export is the mandatory report; it's one click."

## 8. RBAC — security & access  (~1 min)  ← strong finish
- **Where:** top right → **Log out**. Log back in as **`driver@transitops.local` /
  `Transitops2026`**.
- **Do:** Point at the **sidebar — it's different**. The Driver can create/dispatch trips
  but has **no Fleet management, no Fuel & Expenses, no Analytics**.
- **Do:** Log out again → log in as **`finance@transitops.local`** → now **Fuel &
  Expenses and Analytics appear**, but not driver management.
- **Do (optional):** Open **Settings** as Admin → show the **live RBAC matrix table**
  (Role × module), rendered straight from the access policy.
- **Say:** "Access is enforced **on the server**, deny-by-default — hiding a menu item is
  just UX; the API returns **403** regardless. Passwords are **bcrypt-hashed**, sessions
  are **JWT in httpOnly cookies**, all queries are parameterized, and login errors are
  generic to prevent user enumeration."

## 9. Closing  (~30s)
- **Say:** "To recap: all **eight mandatory deliverables** plus Reports/Analytics with
  CSV, dark mode, and expiring-license reminders. It's **documentation-driven** — spec,
  roadmap, and an engineering handbook in the repo. The architecture is strictly layered
  (routes → services → repositories → PostgreSQL), business rules live in **one place**
  per rule and are enforced down to **database constraints**, and it's **deployed live**
  right here. Thank you."
- If time: open the repo and scroll `docs/` (problem.md, checklist.md, ui-audit.md) to
  show the depth, and the two-author commit history for teamwork.

---

## Cheat sheet

**Live app:** http://69.62.76.226:3001

| Role | Email | Password | Use it to show |
|------|-------|----------|----------------|
| Admin | `admin@transitops.local` | `Transitops2026` | everything |
| Fleet Manager | `fleet@transitops.local` | `Transitops2026` | fleet + maintenance |
| Driver | `driver@transitops.local` | `Transitops2026` | trips (limited sidebar) |
| Safety Officer | `safety@transitops.local` | `Transitops2026` | drivers + compliance |
| Financial Analyst | `finance@transitops.local` | `Transitops2026` | fuel/expenses + analytics |

**The five "wow" moments to make sure you hit:**
1. Live **"capacity exceeded — dispatch blocked"** on trip creation.
2. Dispatch flips vehicle+driver to On Trip and removes them from the pools (transactional).
3. Two windows can't double-dispatch the same vehicle (partial-unique race guard).
4. Role switch changes the entire sidebar + API returns 403 (RBAC).
5. Dark mode toggle + one-click CSV export.

**If the demo data gets messy** before judging, it can be reset from the seed on the VPS:
`cd ~/transitops-app && npm run seed:demo`.

**One-line talking point for "why us":** "The database enforces every business rule even
if the API is bypassed, dispatch is transactional and race-proof, and the whole thing is
documented, layered, and deployed live."
