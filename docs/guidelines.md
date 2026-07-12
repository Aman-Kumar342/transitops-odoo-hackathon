# TransitOps — Engineering Guidelines (The Operating System of This Repository)

> **Read this first, every time.** This document defines *how* TransitOps is built.
> It outranks personal preference, habit, and cleverness. If you are an engineer
> joining this repo — or me returning to it months later — this file alone tells you
> exactly how to proceed without deviating from the roadmap or requirements.
>
> This is not aspirational. It is enforceable. A change that violates these rules is
> a defect regardless of whether it "works."

---

## How to use this handbook
- **Before any code change** (feature, bugfix, refactor, or generated code), complete
  the **Mandatory Workflow (§3)**.
- When two rules appear to conflict, resolve with the **Source of Truth Priority (§2)**.
- When something is undefined, follow **Decision Making (§18)** — document an
  assumption; never silently invent.
- A task is done only when it satisfies the **Definition of Done (§19)**. Nothing less.

---

# 1. Project Development Philosophy

**This repository is documentation-driven.**

Documentation is the source of truth. Code follows documentation — never the reverse.

- The system is *specified first* (`docs/problem.md`) and *tracked* (`docs/checklist.md`).
  Code exists to fulfill that specification, not to redefine it.
- If documentation and implementation disagree, **documentation wins** until the
  documentation is explicitly updated through review. You do not get to "fix" the
  mismatch by quietly changing behavior; you either change the code to match the docs,
  or you change the docs *first* (with justification) and then the code.
- "It compiles / it runs" is not the bar. "It matches the specification, enforces the
  business rules, and handles the edge cases" is the bar.
- We optimize for the evaluation criteria in that order of weight: **Database Design
  (highest)**, then Logic, Modularity, Security, Performance, Frontend, Usability,
  Debugging, Attention to Detail. Every decision should be defensible against that
  rubric.

The discipline exists to prevent the failure modes this project is most exposed to:
hallucinated requirements, missed business rules, scope creep, inconsistent
architecture, and regressions in an 8-hour, multi-person build.

---

# 2. Source of Truth Priority

When information conflicts, obey this exact order. **Higher priority always wins.**

| Priority | Source | Notes |
|:-------:|--------|-------|
| **1** | **Original Problem Statement** (the TransitOps PDF) | The contract with the judges. Absolute authority. |
| **2** | **`docs/problem.md`** | The reverse-engineered single source of truth derived from P1. |
| **3** | **Expectation / specification documents** (`expectation.md`, any spec docs) | The evaluator's stated expectations and coding standards. |
| **4** | **Architecture / design documents** (this file + any `docs/architecture.md`, ADRs) | How we build; must not contradict P1–P3. |
| **5** | **`docs/checklist.md`** | The execution tracker. Reflects P1–P4; never overrides them. |
| **6** | **Existing codebase** | Reality. Respected, but subordinate to the docs above. |
| **7** | **Personal assumptions / preference** | Lowest. Only permitted when P1–P6 are silent, and only when written down (§18). |

Rules:
- **Never** let a lower priority override a higher one. A slick code pattern (P6) does
  not get to violate a business rule (P1/P2).
- If P1 and P2 disagree, P1 wins and `problem.md` must be corrected.
- If you must deviate from P1–P4, that is a **specification change** — it requires
  updating the relevant document *first*, with the reason recorded, then the code.

---

# 3. Mandatory Workflow Before Writing Code

Before touching **any** code — feature, bugfix, refactor, or generation — do all of
the following, in order. No exceptions, no "this one is trivial."

1. **Read `docs/problem.md`** — the relevant module (§4), business rules (§5), and
   status machines (§7).
2. **Read `docs/checklist.md`** — confirm the current phase, the exact task, and that
   its dependencies are complete.
3. **Read the expectation/specification docs** (`expectation.md` and any specs).
4. **Read the architecture docs** (this file; `docs/architecture.md` / ADRs if present).
5. **Re-read the original problem statement** (the PDF) when the task touches a
   mandatory feature or business rule.
6. **Understand dependencies** — what must already exist for this task to be correct.
7. **Understand the business rules** in scope (map the task to specific R-numbers).
8. **Identify affected modules** (§4 of problem.md).
9. **Identify impacted APIs** (§11 of problem.md).
10. **Identify impacted database tables** (§12 of problem.md).
11. **Identify impacted UI screens** (§10 of problem.md).
12. **Only then implement.**

If you cannot name the business rules, tables, APIs, and screens a task touches, you do
not understand it yet — stop and finish steps 1–11.

---

# 4. Development Rules

- **Never implement blindly.** Every line traces to a documented requirement.
- **Never guess.** If you don't know, look it up (§18). Unknowns are resolved, not
  assumed.
- **Never assume silently.** Assumptions are written down and labeled (🟨), never
  baked invisibly into behavior.
- **Never skip documentation.** The docs are not optional reading.
- **Never invent requirements.** If it isn't in P1–P4, it isn't a requirement. New
  ideas become documented proposals first.
- **Never remove existing functionality** to make a change easier. Preserve behavior
  unless the docs say to change it.
- **Never simplify a requirement because it looks hard.** Cargo-capacity checks,
  transactional status transitions, and race handling are hard *on purpose* — they are
  the point. Difficulty is not a license to cut scope.
- **Always implement exactly what the documentation specifies** — no more (scope creep),
  no less (missed requirements).

---

# 5. Documentation Rules

- Implementation and documentation must stay **synchronized at all times**.
- When behavior changes, in the same unit of work:
  1. **Update `docs/checklist.md`** (tick boxes, adjust %, add discovered tasks).
  2. **Update `docs/problem.md`** if the spec/behavior changed.
  3. **Update architecture docs** if structure, boundaries, or contracts changed.
- **Never leave documentation outdated.** An out-of-date doc is worse than none — it
  actively misleads. A PR that changes behavior without updating docs is incomplete.
- Documentation changes that alter the specification (not just tracking) require an
  explicit reason recorded in the doc.

---

# 6. Phase Discipline

- **Work only on the current phase** (see `docs/checklist.md` → "Current phase").
- **Do not jump ahead.** No starting Phase 5 work while Phase 4 is open.
- **Do not partially implement future modules.** No stubs or half-features "for later"
  that aren't tracked and finished.
- **Finish one phase completely before moving on.**
- **Every phase ends with:** Validation · Testing · Documentation · Checklist update.
  A phase is not "done" until all four are true and its checklist section is fully
  ticked (or remaining items are explicitly re-scoped and re-tracked).

Phase order is defined in `problem.md` §19 and mirrored in `checklist.md`. It reflects
real dependencies (e.g., Trips depend on Vehicles + Drivers). Respect it.

---

# 7. Checklist Rules

`docs/checklist.md` is **mandatory** and **living**.

- Every completed task must be checked `[x]` **immediately** on completion — not
  batched, not "later."
- **Never mark unfinished work as complete.** A green box is a promise the task is
  truly done and, where applicable, tested.
- **Never skip tiny tasks.** The small boxes (empty states, indexes, validation) are
  where the "attention to detail" score lives.
- **Update the overall and per-phase percentages** on every change.
- **Add newly discovered tasks** under the correct phase (or the "Newly Discovered
  Tasks" list) the moment you find them.
- **Never delete unfinished tasks** to make progress look better. Re-scope explicitly
  and in writing if something is dropped.

---

# 8. Business Rule Enforcement

Business rules (`problem.md` §5, R1–R18) are **sacred**. They are the product.

- **Never bypass a business rule** for convenience or speed.
- Each rule must be enforced across **every applicable layer**:
  - **Database constraint** where expressible (UNIQUE, CHECK, enums, partial-unique
    indexes, FKs).
  - **Backend validation** — *always*, and it is the **authoritative** enforcement
    point (the server never trusts the client).
  - **Frontend validation** — for UX (fast feedback, disabled controls, eligible-only
    pickers). Convenience only, never the sole guard.
  - **UI behavior** — ineligible options are not offered.
  - **API behavior** — correct status codes and error messages on violation.
  - **Testing** — each rule has a happy-path and a violation test.
- The transactional rules (R6–R10) and race guards (R4) are enforced with **DB
  transactions + row locking + partial-unique indexes** — never with app-level
  best-effort checks alone.
- If a rule cannot be expressed at a layer (e.g., "license not expired" can't be a
  static DB CHECK), that is documented and enforced at the next layer down — it is
  never simply dropped.

---

# 9. Architecture Rules

- **Respect the existing architecture and folder structure.** Match the surrounding
  code's patterns, naming, and idioms.
- **Layering is mandatory (Next.js App Router stack):**
  - **Route handlers / Server Actions** = thin transport layer. Parse input, authn/authz,
    call a service, shape the response. **No business logic here.**
  - **`lib/services/`** = business rules (R1–R18), orchestration, transactions. This is
    where logic lives and is unit-testable in isolation.
  - **`lib/repositories/`** = all Prisma/DB access. Nothing else talks to the DB.
  - **`lib/validation/`** = shared schemas (input validation) reused by FE and BE.
  - **UI components** = presentation + client-side UX validation only.
- **Reuse services and utilities.** Do not reimplement dispatch/eligibility logic in
  two places — one service, called everywhere.
- **Avoid duplicate logic.** Cross-cutting rules (eligibility, status transitions, cost
  computation) have exactly one implementation.
- **Keep concerns separated.** Transport ≠ business logic ≠ persistence ≠ presentation.
- **Do not create unnecessary abstractions.** No premature generality, no framework
  wrapping for its own sake. Add an abstraction when there are ≥2 real callers.
- **Do not introduce technical debt** silently. If a shortcut is taken under time
  pressure, it is written down as a tracked task with a `TODO(debt):` marker.

---

# 10. Database Rules

Database design is the **highest-weighted** criterion. Treat the schema as the most
important artifact in the repo.

- **Never create a table without a documented purpose** (must map to an entity in
  `problem.md` §6/§12).
- **Never duplicate data.** Single source of truth per fact (e.g., maintenance cost
  lives in `maintenance_logs.cost`, not also as a duplicate Expense — §18-E).
- **Every table defines, explicitly:**
  - **Primary key**
  - **Indexes** — on every FK and every column used for filtering/search/sort/status.
  - **Constraints** — `UNIQUE`, `CHECK` (ranges, non-negativity), enum/closed sets.
  - **Relations & Foreign keys** — with correct direction and referential action.
  - **Cascade / referential behavior** — master data referenced by history uses
    `RESTRICT` + soft delete; child logs may be deletable by owners.
  - **Audit fields** — `created_at`, `updated_at`, and `created_by`/`deleted_at` where
    useful.
- **Soft delete** for master data (Vehicles → Retire, Drivers → deactivate). History is
  never destroyed by a delete.
- **Partial-unique indexes** enforce single-active invariants (one `Dispatched` trip
  per vehicle/driver; one `Open` maintenance per vehicle). These are not optional — they
  are the primary race guard.
- **Migrations are the only way schema changes.** No manual, undocumented DB edits.
  Every schema change is a reviewable migration.

---

# 11. API Rules

Every endpoint (`problem.md` §11) must explicitly define and implement:

- **Purpose** — one clear responsibility.
- **Authentication** — which endpoints are public (only `POST /auth/login`) vs.
  protected (all others).
- **Authorization** — the exact roles permitted (per the §3 RBAC matrix in problem.md),
  enforced **server-side**, deny-by-default.
- **Validation** — input schema, business rules, relationships, status transitions —
  before any state change.
- **Error handling** — a consistent error envelope; never leak stack traces or internal
  details.
- **Success responses** — correct shape and status (200/201/204).
- **Failure responses** — correct status (400 validation, 401 unauthenticated,
  403 unauthorized, 404 not found, 409 conflict/duplicate/race, 422 business-rule
  violation, 500 server).
- **Idempotency where required** — state transitions must be safe against retries:
  completing an already-completed trip returns a deterministic result, not a double
  side effect. Guard terminal-state transitions explicitly.
- **Pagination, filtering, sorting** on all list endpoints, with **whitelisted** sort/
  filter fields (never interpolate client-supplied column names).

---

# 12. UI Rules

Every page/screen (`problem.md` §10) must include, without exception:

- **Loading state** — skeletons/spinners; never a frozen or blank screen.
- **Empty state** — meaningful message + primary CTA; never a bare empty table.
- **Error state** — clear message + retry; never a silent failure or raw error dump.
- **Permission handling** — controls the current role can't use are hidden/disabled;
  direct access to forbidden routes is handled gracefully.
- **Responsive layout** — works across mobile/tablet/desktop (mandatory deliverable).
- **Accessibility** — semantic HTML, labels on inputs, keyboard navigability, adequate
  contrast (also covers dark mode).
- **Validation feedback** — inline, specific, actionable (e.g., "Enter a valid email",
  "Cargo exceeds vehicle capacity of 500 kg").
- **Success feedback** — toasts/confirmations after mutations.
- **Confirmation dialogs** — for destructive or high-impact actions (retire, dispatch,
  complete, cancel, suspend, delete).
- **Consistency** — one color scheme, spacing scale, and navigation model across all
  screens.

The UI is a *convenience* layer over server-enforced rules — it must guide users toward
valid actions (eligible-only pickers, live capacity checks) but is never the security
or correctness boundary.

---

# 13. Validation Rules

- **Never rely on frontend validation for correctness or security.** It exists for UX.
- **Everything is validated on the backend**, authoritatively, before any state change.
- **Share validation schemas** between FE and BE where possible (`lib/validation/`) so
  the two never drift.
- Validate, at minimum:
  - **Required fields** present.
  - **Formats** — email, phone, dates, numeric types.
  - **Business rules** — R1–R18 (capacity, eligibility, uniqueness, transitions).
  - **Relationships** — referenced vehicle/driver exist and are in a valid state.
  - **Permissions** — the caller's role may perform this action on this object.
  - **Uniqueness** — reg no (normalized), email, license number.
  - **Status transitions** — only valid edges in the §7 state machines.
- Reject unknown/extra fields (defense against mass assignment — §14).

---

# 14. Security Rules

Security is an explicit evaluation criterion. Always account for:

- **Authentication** — email+password, passwords hashed (bcrypt/argon2), never stored
  or logged in plaintext; generic auth errors (no user enumeration).
- **Authorization / RBAC** — enforced server-side on every protected route,
  deny-by-default, per the problem.md §3 matrix. Object-level checks (users act only on
  what their role permits).
- **Input validation** — at the API boundary, always (§13).
- **SQL injection** — parameterized queries / Prisma bindings only; never string-
  concatenate SQL; whitelist sortable/filterable columns.
- **XSS** — escape/encode rendered user content; rely on React's default escaping and
  avoid `dangerouslySetInnerHTML` unless sanitized.
- **CSRF** — protect state-changing requests (same-site cookies / token checks) if using
  cookie-based sessions.
- **Mass assignment** — whitelist writable fields per endpoint; never bind `status`,
  `role_id`, `id`, or computed totals from the request body.
- **Sensitive data exposure** — never return password hashes or secrets; secrets live in
  env vars, never committed (respect `.gitignore`).
- **Audit logs** — record who created/updated critical records and every status
  transition (`created_by`/`updated_by`, optional audit table).

---

# 15. Edge Case Rules

Before marking any feature complete, explicitly answer each question. If any answer is
"undefined behavior," the feature is not done.

- **Two users perform this action simultaneously?** (e.g., double-dispatch — must be
  race-safe: row lock + partial-unique index; loser gets 409.)
- **Data already exists?** (duplicate reg no / license / email — 409, not a crash.)
- **A required relation is missing?** (trip references a retired/deleted vehicle — reject
  with a clear error.)
- **Status changes unexpectedly between read and write?** (re-validate server-side at the
  moment of the transition, not just at form load.)
- **The request is retried?** (idempotent transitions; terminal states reject re-entry.)
- **The API fails midway?** (transactional — full rollback, no partial state such as a
  Dispatched trip with an Available driver.)
- **The network disconnects?** (client handles it; server left in a consistent state.)
- **Invalid data enters?** (rejected at BE with a specific message.)
- **A dependency fails?** (DB down, etc. — 500 with safe message, no partial writes.)

Every discovered edge case is **documented** — add it to `problem.md` §15 and, if
testable, to the checklist. The catalog in §15 is the baseline, not the ceiling.

---

# 16. Testing Rules

Every feature is verified — at minimum mentally, and with automated tests where the
timebox allows — across:

- **Happy path** — the intended flow works end-to-end.
- **Failure path** — invalid input / rule violation returns the correct error.
- **Boundary conditions** — cargo == capacity, license expiring today, odometer equal,
  zero/empty datasets.
- **Invalid inputs** — wrong types, out-of-range, malformed dates.
- **Permission issues** — each role hitting endpoints it should and shouldn't reach.
- **Business rule violations** — each R-number's negative case is exercised.
- **Race conditions** — concurrent dispatch/complete/cancel.
- **Regression risks** — the change doesn't break a previously working flow. Re-run the
  §5 example workflow before declaring a phase done.

Priority when time is short: the **transactional status transitions (R6–R10)**, the
**race guard (R4)**, and the **eligibility/capacity rules (R2/R3/R5)** get tests first —
they are the highest-risk, highest-value logic.

---

# 17. Code Quality Rules

Code must be:

- **Readable** — reads like the surrounding code; clear intent over cleverness.
- **Maintainable** — a new engineer can change it safely.
- **Modular** — small, single-responsibility units; correct layer (§9).
- **Reusable** — shared logic factored into services/utils, not copy-pasted.
- **Strongly typed** — TypeScript throughout; no `any` escape hatches for real domain
  types; DB types flow from Prisma.
- **Consistent** — one style, enforced by linter/formatter; consistent naming.
- **Well named** — names state purpose; no `data2`, `tmp`, `handleThing2`.
- **No magic numbers/strings** — statuses, roles, limits, and enums are named constants
  (e.g., a single `VEHICLE_STATUS` enum), so the KPI/rule definitions have one home.
- **No duplicated logic** — DRY for real rules (not accidental one-line similarity).
- **No dead code** — no commented-out blocks, unused exports, or speculative helpers.

---

# 18. Decision Making Rules

Whenever you are uncertain:

1. **Never guess.**
2. **Search the documentation** — expectation docs, this file.
3. **Search the existing implementation** — is it already solved somewhere?
4. **Search `docs/problem.md`** — the rule/entity/flow is very likely already specified.
5. **Search `docs/checklist.md`** — is it a tracked task with context?
6. **Search architecture docs / ADRs.**
7. **Only then decide.**

If uncertainty remains after all of the above:
- **Explicitly document the assumption** (label it 🟨) in `problem.md` §18, state the
  chosen behavior and the reason, and implement *that* — visibly.
- **Never silently invent behavior.** A documented, reviewable assumption is acceptable;
  an invisible guess is a defect.

---

# 19. Definition of Done

A task is **NOT** complete until **all** of the following are true:

- [ ] Implementation finished (matches the documented spec exactly).
- [ ] Business rules enforced across all applicable layers (§8).
- [ ] Validation added (FE UX + authoritative BE, §13).
- [ ] Errors handled (correct codes, consistent envelope, §11).
- [ ] UI complete (all states + responsive + feedback, §12) — where the task has UI.
- [ ] Backend complete (service + repository + transaction where needed).
- [ ] Database complete (migration + constraints + indexes + audit fields, §10).
- [ ] Checklist updated (boxes ticked, % adjusted, new tasks added, §7).
- [ ] Documentation updated and synchronized (§5).
- [ ] Edge cases reviewed (§15) and documented.
- [ ] Regression checked (§16) — the §5 example workflow still passes.

If any box is unchecked, the task is in progress, not done. Do not report it as complete.

---

# 20. Permanent Reminder

> Before writing even a single line of code, I will first read:
>
> - problem.md
> - checklist.md
> - expectation documents
> - architecture documents
> - roadmap documents
> - original problem statement
>
> I will not hallucinate requirements.
>
> I will not skip business rules.
>
> I will not deviate from the documented roadmap.
>
> I will not invent architecture.
>
> I will implement only what is documented.
>
> Every completed task will immediately update checklist.md.
>
> Documentation is the source of truth.
>
> Code exists to fulfill documentation—not replace it.

---

*End of guidelines.md — the operating system of this repository. Amend deliberately;
these rules exist to keep the build correct, complete, and consistent under pressure.*
