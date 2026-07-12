# TransitOps — UI/UX Compliance Audit (vs. the design mockup)

> Audit of the implemented app against the official Excalidraw mockup
> (`Transitops - smart transport operations platform - 8 hours.svg/.excalidraw`).
> The mockup is treated as the intended design language. Analyzed from the raw
> Excalidraw JSON (2,436 elements: exact colors, font sizes, radii, coordinates) plus
> the 8 rendered screens. **This is an audit only — no code changed.**
>
> Method note: the mockup is drawn in Excalidraw's hand-sketch font (`fontFamily: 1` on
> 1,482/1,495 texts). That is the *wireframe medium*, not a type spec — the intended
> production font is a normal sans-serif, so the hand-drawn look is deliberately NOT
> replicated. Everything else (color, layout, sizing, radii, hierarchy) is a real spec.

---

# 1. Overall Design Match Score

## **Overall: 74 / 100**

Functionally complete and internally consistent, but two high-impact brand/structure
choices diverge from the mockup (accent color and sidebar treatment), and a few screens
are missing secondary panels shown in the design.

| Category | Score | One-line reason |
|---|:---:|---|
| Layout | 72 | Sidebar + top-bar structure is right, but sidebar is light (mockup: dark) and login is a centered card (mockup: split panel). |
| Visual Fidelity | 60 | **Primary accent is purple; mockup is blue `#1971c2`.** Dark sidebar not implemented. Otherwise cards/tables/badges are close. |
| UX | 86 | Flows, eligible-only pickers, live capacity check, confirmations all present and match intent. |
| Consistency | 85 | One design system, shared components (StatusBadge, AppShell, states) — internally very consistent. |
| Responsiveness | 80 | Sidebar collapses to a drawer; tables scroll. Not yet checked at every breakpoint. |
| Accessibility | 74 | Labels, semantic tables, dark mode, focus via native controls; contrast on purple-on-white borderline; some icon-only buttons. |
| Component Matching | 74 | Most components exist; missing: Settings general + RBAC matrix, trip lifecycle stepper, maintenance state diagram, driver "Trip Compl." column. |
| Interaction Matching | 86 | Dispatch/complete/cancel, filters, search, suspend/reinstate, theme toggle all match. |
| Information Hierarchy | 84 | KPIs → recent trips → legend; analytics cards → charts → tables. Matches the mockup's ordering. |
| Hackathon Readiness | 85 | Verified end-to-end, seeded demo, all deliverables. Polished enough to demo; color/sidebar fixes would lift it materially. |

**Bottom line:** the app *behaves* like the mockup and is cleanly built, but it doesn't
yet *look* like the mockup because of the purple-vs-blue accent and the light-vs-dark
sidebar. Those two changes alone move Visual Fidelity from ~60 to ~85.

---

# 2. Design language: mockup vs. implementation

| Token | Mockup (from Excalidraw) | Current implementation | Verdict |
|---|---|---|---|
| **Primary / CTA** | **Blue `#1971c2`** (also `#4d84bf`); 24 blue buttons, 0 purple | Purple `#4a2b6b` (`--color-primary`) | ❌ Wrong hue |
| **Sidebar** | **Dark charcoal `#212529`**, ~190px, light text, colored active item | Light (`--color-surface`), 224px, purple active item | ❌ Different treatment |
| Top bar | White, ~56px, full width, search + avatar | White topbar, search + avatar + theme + logout | ✅ Close |
| Surface / cards | White `#ffffff` | White `--color-surface` | ✅ |
| App background | Light gray `#f8f9fa` / `#f1f3f5` | `#f7f8fa` | ✅ Close |
| Borders | Mantine grays `#dee2e6` / `#e9ecef` / `#ced4da` | `#e2e5ea` | ✅ Close |
| Muted text | `#868e96` / `#495057` | `#5b6472` | ✅ Close |
| Status: Available | Green `#2f9e44` | `#1a8f5c` | ✅ Close |
| Status: On Trip | Blue `#4d84bf` / `#1971c2` | `#2b6cb0` | ✅ Close |
| Status: In Shop | Amber `#f2a900` / `#f08c00` | `#b7791f` | ⚠ Mockup amber is more saturated |
| Status: Suspended/Danger | Red `#e03131` | `#c0392b` | ✅ Close |
| Status: Retired | Gray `#868e96` | Gray | ✅ |
| Card radius | 8–10 | `--radius-md: 10` | ✅ |
| Button radius | 6 | `--radius-sm: 6` | ✅ |
| Badge radius | 28 → pill | 999 (pill) | ✅ |
| Headings | 22–24 | h1 22 | ✅ |
| KPI numbers | 26–32 | 30 | ✅ |
| Body / labels | 10.5–13 | 13–15 | ⚠ Mine slightly larger |
| Font | Sans-serif (sketch medium) | `system-ui` | ✅ (intent) |

**Net:** the neutral palette, radii, and typography already match. The **two brand
tokens are wrong: accent hue (purple→blue) and sidebar theme (light→dark).**

---

# 3. Component Inventory

| Component | In mockup | In implementation | Status |
|---|:---:|:---:|---|
| Sidebar nav | ✔ (dark) | ✔ (light) | ⚠ theme differs |
| Top bar (search + avatar) | ✔ | ✔ (+theme/logout) | ✅ |
| KPI stat cards | ✔ | ✔ | ✅ |
| Fleet utilization tile | ✔ (%) | ✔ (+progress bar) | ✅ |
| Dashboard filters (type/status/region) | ✔ | ✔ | ✅ |
| Recent Trips table | ✔ | ✔ | ✅ |
| Vehicle Status legend | ✔ | ✔ | ✅ |
| Vehicle table (Fleet) | ✔ | ✔ | ✅ |
| Driver table | ✔ (incl. "Trip Compl.") | ✔ (no trip-compl column) | ⚠ missing column |
| Trip create form | ✔ | ✔ | ✅ |
| Trip lifecycle stepper (Draft→…→Cancelled) | ✔ | ✖ (badges only on detail) | ❌ missing |
| Live Board / trip list | ✔ | ✔ (trips list) | ✅ |
| Maintenance form | ✔ | ✔ | ✅ |
| Maintenance state-flow diagram | ✔ (decorative) | ✖ | ⚠ missing (decorative) |
| Maintenance/Service log table | ✔ | ✔ | ✅ |
| Fuel logs table | ✔ | ✔ | ✅ |
| Expenses table | ✔ | ✔ | ✅ |
| "Total operational cost" summary line | ✔ (on Fuel&Exp screen) | ⚠ (on vehicle detail + analytics, not on this screen) | ⚠ placement |
| Analytics KPI cards (4) | ✔ | ✔ | ✅ |
| ROI formula line | ✔ | ✔ | ✅ |
| Monthly Revenue chart | ✔ | ✔ (bar chart) | ✅ |
| Top Costliest Vehicles | ✔ | ✔ | ✅ |
| Export CSV button | ✔ | ✔ | ✅ |
| Status badges | ✔ | ✔ | ✅ |
| Search | ✔ | ✔ | ✅ |
| Filters / dropdowns | ✔ | ✔ | ✅ |
| Confirmation dialog | ✔ | ✔ (inline confirm) | ⚠ inline vs modal |
| Login form | ✔ (split panel) | ✔ (centered card) | ❌ layout differs |
| Login role dropdown | ✔ | ✖ (by design — role from account) | ⚠ intentional |
| Login remember-me / forgot-password | ✔ | ✖ | ⚠ minor |
| Settings: General (depot/currency/unit) | ✔ | ✖ | ❌ missing |
| Settings: RBAC matrix table | ✔ | ✖ | ❌ missing |
| Change password | ✖ (not in mockup) | ✔ | ✅ (extra, fine) |
| Dark mode | ✔ (login shown dark) | ✔ | ✅ |
| Avatar chip (initials) | ✔ | ✔ | ✅ |

---

# 4. Screen-by-screen audit

Legend: ✅ matches · ⚠ slight deviation · ❌ missing/wrong.

## Screen 0 — Authentication (Login)
- ❌ **Layout — split panel vs centered card.**
  - Current: single centered white card on a plain background.
  - Expected: **two-panel split** — a dark brand panel (`#14181c`/`#1c2228`, ~571px)
    on the left ("One login, four roles" + role→area list) and the form card on the right.
  - Reason: the mockup uses a marketing-style split login; it also renders a dark-mode
    variant, confirming the dark panel is intentional.
  - Severity: **High** (first screen a judge sees).
  - Fix: wrap login in a 2-column grid; left = dark panel with brand + the RBAC role list
    text; right = existing form card.
- ⚠ Role dropdown / Remember-me / Forgot-password present in mockup, absent in impl.
  - Intentional for role (account-derived, more secure — documented in problem.md §18-O).
  - Remember-me + forgot-password are low-effort polish; add if time allows.
  - Severity: Low–Medium.
- ⚠ Error state: mockup shows "Invalid credentials. Account locked after 5 failed
  attempts." Impl shows the generic invalid-credentials error but no lockout copy.
  - Severity: Low.

## Screen 1 — Dashboard
- ✅ KPI tiles, filters (type/status/region), Recent Trips table, Vehicle Status legend —
  all present with matching hierarchy.
- ⚠ **Sidebar is light; mockup sidebar is dark.** (Global — see §2, applies to every screen.)
- ⚠ **Accent color purple vs blue** on the utilization tile, active nav, links. (Global.)
- ⚠ KPI card sizing: mockup uses a fixed 4-across row of ~245×120 cards; impl uses
  `auto-fit minmax(170px)` which can produce a different column count at some widths.
  - Severity: Low. Fix: constrain to a 4-column grid at desktop.

## Screen 2 — Vehicle Registry ("Fleet")
- ✅ Table columns match (Reg No unique, Name/Model, Type, Capacity, Odometer, Acq Cost,
  Status), "+ Add Vehicle", Type/Status filters, search, rule note.
- ⚠ Nav label "Fleet" ✅ (already aligned). Accent/sidebar globals apply.
- ⚠ Table has no zebra striping / row hover in mockup style; impl rows are plain with a
  bottom border (acceptable, but mockup rows read slightly denser). Severity: Low.

## Screen 3 — Drivers & Safety Profiles
- ✅ Table with license badge, category, expiry, safety, status; suspend/reinstate; rule
  note; expiring-license reminder (bonus, not in mockup but on-theme).
- ❌ **Missing "Trip Compl." column** (trip-completion %) shown in the mockup driver table.
  - Reason: not modeled; would need completed-trip count per driver.
  - Severity: Medium. Fix: compute completed-trip count (or %) per driver and add a column.
- ⚠ Mockup shows a "Toggle Status" control cluster (Available/On Trip/Off Duty/Suspended);
  impl uses discrete action buttons (Suspend/Reinstate/Duty) on the detail page. Behavior
  equivalent; presentation differs. Severity: Low.

## Screen 4 — Trip Dispatcher
- ✅ Create-trip form with available-only vehicle/driver pickers + **live "capacity
  exceeded — dispatch blocked"** (matches exactly), trips list.
- ❌ **Missing "Trip Lifecycle" stepper** (Draft → Dispatched → Completed → Cancelled)
  shown as a horizontal stage indicator at the top of the screen.
  - Impl shows status only via a badge + a timeline on the detail page.
  - Severity: Medium. Fix: add a small stage-stepper component on the trip detail (and/or
    list header).
- ⚠ Mockup "Live Board" shows richer trip rows (vehicle/driver, route, ETA/note). Impl
  trips table has route/vehicle/driver/cargo/status but no ETA/note column. Severity: Low.

## Screen 5 — Maintenance
- ✅ "Log Service Record" form (vehicle, type, cost, date, status), Service Log table.
- ⚠ **Missing the state-flow diagram** (Available → creating record → In Shop → closing →
  Available). Decorative but reinforces the R9/R10 rule visually.
  - Severity: Low. Fix: a small 3-node flow strip above the form.

## Screen 6 — Fuel & Expense Management
- ✅ Fuel logs table + Other Expenses table on one screen (matches the merge).
- ⚠ **"Total Operational Cost (auto) = Fuel + Maintenance"** headline number is shown on
  this screen in the mockup; impl surfaces it on vehicle detail + analytics instead, with
  only a text note here.
  - Severity: Medium. Fix: add a fleet-wide operational-cost summary strip to this screen.

## Screen 7 — Reports & Analytics
- ✅ 4 KPI cards (Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI), ROI
  formula line, Monthly Revenue chart, Top Costliest Vehicles, Export CSV.
- ⚠ Chart is a simple CSS bar chart; mockup implies a slightly richer chart. Acceptable
  (no chart lib, per "minimal third-party"). Severity: Low.

## Screen 8 — Settings & RBAC
- ❌ **Missing "General" settings** (Depot Name, Currency `INR (Rs)`, Distance Unit).
  - Impl Settings has only Change Password.
  - Severity: Medium. Fix: add a General settings card (can be client-side/no-op persisted
    or a small settings table).
- ❌ **Missing the RBAC matrix table** (Role × Fleet/Drivers/Trips/Fuel-Exp/Analytics).
  - The data exists (`lib/auth/rbac.ts`); it's just not rendered.
  - Severity: Medium (great "attention to detail" win, low effort). Fix: render the RBAC
    matrix read-only from the policy object.

---

# 5. Pixel / polish audit

- ⚠ **Accent hue** (purple) is the single biggest polish issue — appears on buttons, nav
  active state, links, utilization bar, chart bars, avatar. One token change fixes all.
- ⚠ **Sidebar contrast**: light sidebar makes the active item (purple fill) the only
  strong color; the mockup's dark sidebar gives the app a more "product" feel.
- ⚠ **Body font size**: impl uses 15px base / 14px table text; mockup labels sit at
  10.5–13. Slightly tightening table/label text would increase density to match.
- ⚠ **KPI card grid**: `auto-fit` can yield 5–6 columns on wide screens vs the mockup's
  fixed 4. Constrain columns.
- ✅ Radii (card 10 / button 6 / badge pill), border weight (1px), card padding (24px),
  and shadows (subtle) are consistent and match the mockup.
- ✅ Status badge system is uniform across vehicles/drivers/trips/maintenance (one
  `StatusBadge` component) — good design-system discipline.
- ⚠ Buttons: only two variants (`.btn`, `.btn--primary`). Mockup implies a subtle
  secondary/ghost and a destructive (red) variant (e.g., Retire/Delete). Impl reuses the
  neutral `.btn` for destructive actions. Add a `--danger` variant for polish.
- ⚠ Tables: no hover highlight on rows; adding a subtle row hover improves scannability.

---

# 6. Design-system audit

- ✅ **One system, centralized:** design tokens in `globals.css` (colors, spacing, radii,
  shadows), a single `AppShell`, one `StatusBadge`/`LicenseBadge`, shared
  Loading/Empty/Error states, and reused form/section components (`FuelSection`,
  `ExpenseSection`, `VehicleForm`, `DriverForm`). Low duplication.
- ⚠ **Inline styles everywhere:** components use `style={{…}}` objects rather than CSS
  classes/utilities. It's consistent but verbose, and table cell/header styles (`Th`/`Td`)
  are re-declared per file. Opportunity: extract a shared `<DataTable>`/`Th`/`Td` and a
  few utility classes to guarantee identical table styling app-wide.
- ⚠ **Repeated patterns that should be components:** the list+filter+pagination shell is
  re-implemented on vehicles/drivers/trips/maintenance pages. A `<ResourceList>` wrapper
  would reduce drift and lock spacing/row-height consistency.
- ✅ Color usage flows from tokens (few hard-coded hexes outside `globals.css` and
  `StatusBadge`) — so the purple→blue change is genuinely one-file.

---

# 7. Responsive audit

- ✅ **Sidebar** collapses to an off-canvas drawer with a hamburger < 860px (implemented).
- ✅ **Tables** are wrapped in `overflow-x:auto` containers → horizontal scroll instead of
  breaking the layout.
- ✅ KPI/stat grids use `auto-fit minmax(...)` → reflow down to 1 column on mobile.
- ⚠ Not yet verified visually at Laptop (~1280) / Tablet (~768) / Mobile (~375) — I can't
  screenshot from this environment. Likely-OK but unconfirmed:
  - Dashboard's 2-column "Recent Trips / Legend" grid uses fixed `2fr/1fr` — should stack
    on narrow screens (add a max-width breakpoint).
  - Analytics 2-column (chart/top-costliest) same concern.
- ⚠ The fixed KPI card count differs from mockup at very wide screens (see §5).
- ✅ No obvious overflow/broken-grid risks in the code; page body never scrolls
  horizontally (tables scroll within their own container).

---

# 8. Accessibility audit

- ✅ Inputs have associated `<label>`s; tables use semantic `<table>/<thead>/<th>`.
- ✅ Dark mode implemented and theme-aware; no-flash script.
- ✅ Error/alert regions use `role="alert"`; loading uses `role="status"`.
- ⚠ **Contrast:** purple `#4a2b6b` on white is fine; but muted `#5b6472` on `#f7f8fa` and
  small 11px uppercase labels are borderline — verify ≥ 4.5:1. Switching to blue keeps
  contrast strong.
- ⚠ Icon-only controls: the theme toggle (emoji) and hamburger (`☰`) rely on `title`/
  `aria-label` (present) — good, but emoji as the only affordance is marginal.
- ⚠ Focus states rely on native browser outlines; the mockup doesn't specify focus, but a
  visible `:focus-visible` ring on buttons/inputs would strengthen keyboard UX.
- ⚠ Status conveyed by color + text label (good), but the dashboard legend/badges should
  ensure non-color cues (they use text labels — ✅).

---

# 9. Prioritized fix plan

Effort key: XS ≈ <15 min · S ≈ 15–45 min · M ≈ 1–2 h · L ≈ half-day.

## Priority 1 — Critical (brand fidelity; do these first)
| # | Page/Component | Issue | Expected outcome | Complexity | Effort |
|---|---|---|---|---|---|
| 1 | Global (`globals.css`) | Primary accent purple → **blue `#1971c2`** (+ hover, dark-mode variant) | App-wide color matches the mockup; buttons/nav/links/chart all update from one token | Trivial | XS |
| 2 | `AppShell` + `globals.css` | **Dark sidebar** (`#212529`, ~190–224px, light text, blue active item) | Sidebar reads like the mockup's product chrome | Low | S |
| 3 | `app/login` | **Two-panel split login** (dark brand panel + form card) | First-impression screen matches the design | Medium | M |

## Priority 2 — Important (missing components judges will look for)
| # | Page/Component | Issue | Expected outcome | Complexity | Effort |
|---|---|---|---|---|---|
| 4 | `app/settings` | Add **General settings** (depot, currency INR, distance unit) + **RBAC matrix table** (render from `rbac.ts`) | Settings screen matches mockup; showcases RBAC | Low–Med | M |
| 5 | Trip detail/list | **Trip lifecycle stepper** (Draft→Dispatched→Completed→Cancelled) | Matches mockup's stage indicator | Low | S |
| 6 | Drivers table | Add **"Trip Compl."** column (completed-trip count/%) | Column parity with mockup | Med (needs per-driver aggregate) | M |
| 7 | Fuel & Expenses | **Fleet operational-cost summary strip** (Fuel + Maintenance total) on-screen | Headline number appears where the mockup shows it | Low | S |

## Priority 3 — Polish (raise Visual Fidelity/consistency)
| # | Page/Component | Issue | Expected outcome | Complexity | Effort |
|---|---|---|---|---|---|
| 8 | Buttons | Add **destructive (red)** and ghost/secondary variants; use red for Retire/Delete | Clear action semantics, matches mockup emphasis | Low | S |
| 9 | Tables | Shared `<DataTable>`/`Th`/`Td` + subtle **row hover**; tighten label/text size to 12–13 | Uniform, denser tables matching the mockup | Low | M |
| 10 | Dashboard/Analytics | Constrain KPI grid to **4 columns** at desktop; stack 2-col sections on tablet/mobile | Grid matches mockup at all widths | Low | S |
| 11 | Maintenance | Small **state-flow strip** (Available→In Shop→Available) | Visual reinforcement of R9/R10 | Low | S |
| 12 | Global | `:focus-visible` ring on interactive elements | Stronger keyboard a11y | Low | XS |

## Priority 4 — Nice to have
| # | Page/Component | Issue | Expected outcome | Complexity | Effort |
|---|---|---|---|---|---|
| 13 | Login | Remember-me + forgot-password (visual), lockout copy in error state | Cosmetic parity with mockup | Low | S |
| 14 | Trips | "Live Board" ETA/note column | Row parity with mockup | Low | S |
| 15 | Design system | Extract `<ResourceList>` wrapper for list pages | Less duplication, guaranteed consistency | Med | M |
| 16 | Analytics | Richer chart (still no external dep) | Slightly closer to mockup chart | Med | M |

---

## Summary of what moves the score most
1. **Blue accent (P1-1)** and **dark sidebar (P1-2)** — together lift Visual Fidelity from
   ~60 to ~85 and Layout from ~72 to ~85. Lowest effort, highest impact.
2. **Split login (P1-3)** — biggest single-screen fidelity gain.
3. **Settings General + RBAC matrix (P2-4)** — cheap "attention to detail" that judges
   reward, and the RBAC table visibly demonstrates the access model.

Doing **P1 + P2** would raise the overall match from **74 → ~88**. Adding **P3** →
**~92**. None of it changes functionality; it's all presentation and a few read-only
additions built on data that already exists.
