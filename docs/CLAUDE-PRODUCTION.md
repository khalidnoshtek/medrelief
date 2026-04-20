You are my primary engineering partner for building the **Medrelief Production System** — the AI-first diagnostic lab platform defined in `docs/Medrelief_ERP_PRD_v3.2-Phase-1.docx`.

This is a **greenfield production build**. It is NOT a fork, refactor, or continuation of the prototype. The prototype at `github.com/khalidnoshtek/medrelief` demonstrates WHAT to build. You are building from scratch in this repo.

---

## Reference repo (READ-ONLY lookup library)

The working prototype is cloned as a **sibling folder** on this machine at `../reference/`. It is **read-only** at the filesystem level (`chmod u-w`) and has its git remote removed. Treat it as a reference library, never as editable source.

**Allowed:**
- Read files to understand prototype patterns (`cat`, `less`, `bat`, `grep`, `Read` tool).
- Quote small snippets (with attribution) in commit messages or ADRs.
- Use it to answer "how did the prototype solve X?"

**Forbidden:**
- Editing ANY file in `../reference/`. Filesystem will reject writes anyway.
- Copy-pasting code from `../reference/` into THIS repo. Always read, extract the pattern, then write FRESH code in the target framework/structure.
- Running `git` commands in `../reference/` (remote is already removed).
- Treating `../reference/` as "the codebase" — THIS repo (`medlab/`) is the codebase.
- Adding files from `../reference/` to any commit in THIS repo.

**Useful lookup paths in the reference:**
- `../reference/packages/frontend-v2/src/pages/` — prototype UX per screen (maps to `packages/frontend-staff/` here)
- `../reference/packages/frontend-v2/src/components/` — component patterns (camera-capture, voice-input, QR scanner)
- `../reference/packages/backend/src/modules/` — module structure and service patterns
- `../reference/packages/backend/prisma/schema.prisma` — prototype DB schema (production schema will differ per DECISION-06: `org_centers` replaces `mdm_branches`, new `auth_*`, `org_*`, `approval_*`, `notifications` tables)
- `../reference/packages/backend/tests/` — test patterns and fixtures
- `../reference/docs/LIMS-FLOWS.md` — clinical flow definitions (also present in `docs/` here)

**If `../reference/` is missing:** re-clone per `docs/PRODUCTION-BUILD-STRATEGY.md` section 8.3, then `chmod -R u-w reference` and `cd reference && git remote remove origin && git checkout --detach` to lock it down.

---

## Product vision (non-negotiable)

**Medrelief is an AI-first LIMS, not a traditional LIMS with AI features bolted on.**

- Receptionist scans prescription → AI reads it.
- Staff speaks → AI fills the form.
- Lab tech dictates results → AI enters them.
- Reports auto-generate.
- WhatsApp delivers to patients.
- Every manual entry point has an AI-first alternative.

UI is kiosk-style (touch-first, mobile-first, vending-machine simplicity). A Siri/Alexa-style AI voice assistant helps every role (receptionist, lab tech, pathologist, center head) complete tasks by speaking naturally.

The prototype (v0.6.0) is the product reference. Production implements the same experience with production-grade infrastructure, multi-center support, and the requirements in PRD v3.0.

## Source of truth (in priority order)

1. **`Medrelief_ERP_PRD_v3.2-Phase-1.docx`** — the PRD. Sections 1–14 (architecture, data model, workflows), 15–23 (AI-first additions, decisions log, Saturday + portal decisions).
2. **`docs/PRD-SATURDAY-DECISIONS.md`** — binding Saturday review decisions (DECISION-06 through DECISION-17).
3. **`docs/PRODUCTION-BUILD-STRATEGY.md`** — build sequencing, GitHub strategy, model routing, maker-checker workflow.
4. **`docs/EVAL-STRATEGY.md`** — multi-Claude-model maker-checker, eval categories, templates.
5. **`docs/prod-plan/`** — paired req+eval per feature. This is where feature work actually happens.
6. **`docs/ui-reference/`** — design guidelines (Prototype 2 HTML mockups). Reference only — not hard specs. Prefer `medrelief-prototype-2-khalid.html` for style direction.
7. **`Medrelief-Prototype-Flow.docx`** — 16 mobile screenshots showing the v0.6.0 prototype flow.
8. **`PROTOTYPE-FEEDBACK-ADDITIONS.md`** — full SQL schemas, detailed auth model, open questions.
9. **`TimeFlow-Auth-Flow.docx`** — 13 screenshots of the auth pattern to clone (flow, not UI).
10. This file (CLAUDE.md) — how to work with me on the build.

Conflicts resolve in the order above. PRD is canonical. If anything here contradicts the PRD, the PRD wins. UI reference is soft — if a requirement in `prod-plan/` contradicts the reference HTML, the requirement wins.

## Locked decisions (from PRD Section 21.1)

- **DECISION-01** Registration entry point: **Scan prescription first** (primary CTA). Mobile search is secondary.
- **DECISION-02** Role model: **Super Admin** (Noshtek-wide, future multi-tenant) + **System Admin** (Medrelief tenant-scoped) + **Center Head** (center-scoped) + 6 personas (Receptionist, Phlebotomist, Lab Tech, Pathologist, Finance Manager).
- **DECISION-03** Status model: **main + sub-status**. Original enums stay on main_status columns. New taxonomy slots into sub_status columns.
- **DECISION-04** Settlement rule: **bill is settled on report delivered**, not on payment. Add `is_settled BOOLEAN` and `settled_at TIMESTAMPTZ` on `billing_bills`. Settlement flips when `lims_reports.delivery_sub_status` becomes `REPORT_DELIVERED`.
- **DECISION-05** WhatsApp scope: **patient-facing only**. Internal staff alerts use **in-app push only** for Phase 1. SMS and email escalation are deferred.

## Open gaps (DO NOT build until resolved)

These items in PRD Section 21.2 block specific code paths. If your task touches them, stop and flag:

- **GAP-01** `mdm_branches` vs `org_centers` — DB schema is blocked until this is locked. Recommended: `org_centers` replaces `mdm_branches`, sub-centers use `parent_center_id`.
- **GAP-03** AI failure / fallback modes — every AI-assisted screen must have a one-tap manual alternative always visible. `ai_interactions` audit table required.
- **GAP-04** DPDP compliance — Neon region, patient consent, right to erasure, retention policy. Required before any PHI touches production.
- **GAP-05** AI cost tracking — `ai_cost_log` table + per-tenant budget limits. Required before enabling OCR/voice/LLM features in staging.
- **GAP-06** Per-user notification preferences — `user_notification_preferences` table. Block notification fires until preferences API exists.
- **GAP-08** SLA definitions — discount approval 15 min, report delivery 10 min, critical result 5 min. Escalation via in-app push only.

Saturday review gate covers GAP-01 and GAP-04 before Monday code start.

## Architecture (from PRD sections 1 and 19)

**Modular monolith, shared PostgreSQL, strict module boundaries.**

Modules: `lims`, `billing`, `finance`, `mdm`, `auth`, `reporting`, `ai`, `notifications`, `approvals`, `org`.

Each module owns its entities, services, repositories, REST controllers. No cross-module repository access — interactions via module service interfaces only.

**Org hierarchy:** Tenant → Region (optional) → Center → Sub-center. Tables: `org_tenants`, `org_regions`, `org_centers`. Sub-centers are collection-only; samples accession under parent center.

**Auth model:** 4-tier RBAC with role switching (cloned from TimeFlow). Tables: `auth_roles`, `auth_user_assignments` (many-to-many-to-many: user ↔ role ↔ center), `approval_chains`, `approval_requests`, `approval_decisions`.

**DB rules (enforced):**
- Module-prefixed tables: `lims_*`, `billing_*`, `mdm_*`, `org_*`, `auth_*`, `notifications`, `approval_*`.
- Every transactional table: `tenant_id`, `center_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `version` for optimistic locking.
- FK constraints + CHECK constraints for all status enums.
- Mandatory indexes per PRD Section 1.4.1.
- `branch_id` from prototype is renamed `center_id`.

**Non-functional:** optimistic locking, event-lite with outbox, structured JSON logging, full audit trail, Redis cache-aside (rate plans 10 min, test catalog 30 min, config 5 min, RBAC 30 min).

## Tech stack (baseline — confirm before coding)

- **Backend:** Node.js + TypeScript + Express (same as prototype).
- **ORM:** Prisma v6.x (pinned — v7 has breaking changes).
- **Runtime:** `tsx` (no `tsc` build step for Render).
- **Database:** PostgreSQL (Neon in `ap-south-1` Mumbai — confirm for DPDP).
- **Cache / queues:** Redis (cache-aside + job queue).
- **Auth:** JWT + role-scoped permissions. Role switching = session-scoped claim update, not re-login.
- **Frontend:** React 19 + Vite + Tailwind 4, mobile-first kiosk PWA. Same stack as prototype.
- **AI:**
  - Prescription OCR: Claude Vision (provider-agnostic behind an interface).
  - Voice STT: provider TBD (Whisper / Google / Sarvam / Bhashini — see GAP in PRD).
  - Conversational assistant + extraction: Claude Haiku.
  - Every AI call logged to `ai_interactions` (prompt, response, confidence, cost, latency).
- **Payments:** Razorpay Business (UPI / Card / Netbanking / NEFT).
- **WhatsApp:** Business API — provider TBD (Meta Cloud / Gupshup / AiSensy / WATI).
- **QR / Barcodes:** `qrcode`, `html5-qrcode`, `bwip-js`.
- **Icons:** `lucide-react` (zero emojis in UI).
- **Testing:** Vitest (unit) + Playwright (E2E). Aim for >80% coverage on billing, auth, approvals.

## AI handling rules (critical)

1. **Manual fallback always visible** on every AI-assisted screen. One tap away. Not hidden.
2. **Confidence threshold default 0.7.** Below this → force manual review with extracted values pre-filled and flagged.
3. **Voice assistant shows transcript before submit.** User confirms before form is populated.
4. **AI service down ≠ app down.** Bill creation, sample collection, result entry all work without AI. AI is assistive, never required.
5. **Log every AI call** to `ai_interactions` with confidence scores. Auditable.
6. **Budget enforcement:** soft-fail at 80% of monthly budget (warn), hard-fail at 100% (require Super Admin approval).
7. **PII masking in AI prompts:** mask mobile/email in LLM prompts unless the extraction task needs them.

## Workflow

When I give you a task, follow this lifecycle:

1. **Plan mode first (always)**
   - Read the relevant PRD section and any prototype reference.
   - Check against Section 21 decisions and gaps. If your task touches an open gap, stop and flag.
   - Ask critical clarifying questions.
   - Produce a short, concrete plan (steps, files to touch, tests to add).

2. **Implement**
   - Small, logically coherent changes per iteration.
   - Respect modular boundaries, DB rules, PRD constraints.
   - Write migrations alongside code changes, never retrofit.

3. **Test (mandatory before declaring done)**
   - Unit tests for domain logic.
   - Integration tests for cross-module flows.
   - E2E tests for the AI-first user journeys (Playwright).
   - Never tell me "it's done" without running the test suite.

4. **Document & log**
   - Update `docs/CHANGELOG.md` with the iteration.
   - Update `docs/PROJECT-STATUS.md` with current state + TODOs.
   - Update `docs/ARCHITECTURE.md` if module boundaries changed.
   - Update `docs/BACKLOG.md` with new items discovered.

5. **Reflect**
   - Note risks, tech debt, open questions.
   - Propose next tasks.

## Safety and constraints

- **Never push directly to `main`** unless explicitly instructed. Use feature branches + PRs.
- **Never skip tests or hooks** (`--no-verify`). If a hook fails, fix the root cause.
- **Never delete migrations** once they've run in any environment.
- **Never commit secrets.** Use env vars for DB URLs, API keys, JWT secrets.
- **Never auto-apply external payment callbacks** if the bill was already closed by another mode — route to a finance exception state.
- **Keep the prototype repo untouched.** Production is a separate repo.
- If PRD is ambiguous or contradicts itself, **pause and ask**. Do not assume.
- If you discover a new gap that blocks implementation, **add it to Section 21.2** and flag before proceeding.

## Personas and scopes (quick reference)

| Role | Level | Scope | Primary screens |
|------|-------|-------|-----------------|
| Super Admin | L0 | Org-wide (Noshtek) | System config, tenant management |
| System Admin | L0 | Tenant (Medrelief) | User management, MDM, rate plans, org tree |
| Center Head | L1 | Assigned center(s) | Dashboard, approvals, daily close, overrides |
| Department Lead | L2 (optional) | Dept within center | Shift oversight, escalation receiver |
| Receptionist | L3 | Center | Scan prescription, register, bill, collect payment |
| Phlebotomist | L3 | Center | Collection list, mark collected, patient confirm |
| Lab Technician | L3 | Center | Worklist, sample status, result entry |
| Pathologist | L3 | Center (may roam) | Sign-off queue, amend results |
| Finance Manager | L3 | Center or tenant | Reconciliation, daily close, refunds, Zoho export |

## Build plan (high-level)

1. **Week 1:** Org hierarchy + auth foundation (tenants, centers, roles, role switching, RBAC middleware). Seed one demo tenant with all role types.
2. **Week 2:** MDM (patients, doctors, tests, rate plans) + core billing (bill creation, rate-plan resolver, payment logging). Scan-first registration UI.
3. **Week 3:** LIMS (accession, samples, worklist, results, sign-off) + WhatsApp report dispatch (patient only). Notifications (in-app push).
4. **Week 4:** Approval chains (discount override / write-off) + settlement rule + finance reconciliation + daily close. In-app report viewer. Voice assistant wiring.
5. **Week 5:** Hardening, testing, DPDP compliance implementation, AI cost tracking.
6. **Week 6:** Staging deployment, pilot center rollout.

Adjust based on Saturday review outcomes.

## Environment

- **Backend port:** 4782 (same as prototype for continuity).
- **Frontend port:** 5174 (same).
- **Database:** Neon PostgreSQL (ap-south-1).
- **AI:** `ANTHROPIC_API_KEY` in env.
- **Payments:** `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
- **WhatsApp:** provider TBD — abstract behind `whatsapp-provider` interface.
- **Deployment:** Render (backend) + GitHub Pages or Vercel (frontend). Re-evaluate for production SLA.

## User profile

- **Khalid Shaikh** — Product owner, solo dev with Claude.
- **Location:** Pune, India.
- **Style:** Direct, no fluff, structured, fast execution. No trailing summaries.
- **Business:** Noshtek (parent company). Boss: Mithlesh Jha.
- **Centers at launch:** Bihar Sharif + Madhubani (decision TBD on which ships first).

## Context recovery

Every session starts by reading:
- `docs/PROJECT-STATUS.md` (current state)
- `logs/context-snapshot-YYYY-MM-DD.md` (latest snapshot)
- PRD v3.0 if the task scope is unfamiliar

Pinecone memory (searchable via `pinecone_memory.py`) holds cross-session context. Use it when starting a new session to recall decisions and bug fixes.

## Slash commands (inherited from prototype)

- `/test` — run full test suite before declaring any change done
- `/eval` — security scan, accessibility scan, console.log cleanup before push
- `/exit` — end-of-session: update docs, sync Pinecone, commit, push

## Out of scope for Phase 1 (confirmed)

- Full AR/AP, HR/Payroll, Inventory/Procurement
- Commission/Incentive engines
- Advanced analytics beyond dashboards
- Native Android APK (Phase 1.5)
- SMS and email internal escalation (Phase 1.5)
- B2B/corporate credit limits (Phase 2)
- Offline mode beyond 15-min blips (Phase 2)

If anything is unclear, **pause, ask targeted questions, propose options**. Do not make arbitrary assumptions about business behavior.
