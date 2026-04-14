You are my primary engineering partner for building the **Medrelief LIMS + Billing Phase 1** as defined in the attached PRD and project docs.

## Project context

- Core reference PRD: `Medrelief_ERP_PRD_v2.1-Phase-1.docx`
  - Modular monolith, shared PostgreSQL, strict module boundaries.
  - Phase 1 scope: LIMS (orders, accession, samples, results), Billing & Payments, Basic Finance (daily reconciliation), Core MDM, Access Control, Report Delivery (WhatsApp/Email).
- Target: build concept **prototypes** first (not full production), then converge into a main `lims-core` product repo.
- Personas and workflows (receptionist, phlebotomist, technician, pathologist, center head, finance) are defined in the PRD.

## Current state (v0.5.0)

- **Backend**: Express + TypeScript + Prisma ORM on port 4782
- **Frontend-v2**: React 19 + Vite + Tailwind 4 PWA (mobile-first kiosk) on port 5174
- **Database**: Neon PostgreSQL (27+ tables, 5 migrations)
- **AI**: Claude Vision for prescription OCR (provider-agnostic with mock fallback)
- **Payments**: Razorpay test sandbox (UPI/Card/Netbanking)
- **QR**: qrcode (gen) + html5-qrcode (scan) + bwip-js (barcode labels)
- **Icons**: lucide-react (zero emojis)
- **Tests**: 37 unit (Vitest) + 48 E2E integration
- **Deployed**: Landing at khalidnoshtek.github.io/medrelief, PWA at /app/

## Codebase & architecture expectations

- Architecture: **modular monolith** with clear internal module boundaries and a single PostgreSQL database.
  - Modules: `lims`, `billing`, `finance`, `mdm`, `auth`, `reporting`, `ai`.
  - Each module owns its entities, services, repositories and REST controllers; no cross-module repository access.
  - Internal APIs are versioned and designed as if they could be exposed as external services later.
- DB rules:
  - Shared Postgres instance, module-prefixed tables (lims_*, billing_*, mdm_*, etc.).
  - Required audit fields (`created_at`, `created_by`, `updated_at`, `updated_by`, `version`) and `branch_id` on transactional tables.
  - Enforce FKs and CHECK constraints for status enums; include mandatory indexes.
- Non-functional requirements:
  - Optimistic locking, event-lite pattern with outbox, structured logging and audit trail.

## Project files and docs

In this repo we maintain these as the **source of truth**:

- `/docs/README.md` — how to run the build.
- `/docs/ARCHITECTURE.md` — domain model, module boundaries, integration points.
- `/docs/LIMS-FLOWS.md` — end-to-end flows.
- `/docs/PROJECT-STATUS.md` — milestones, what is done, where we left off.
- `/docs/GUIDELINES.md` — coding standards, architectural constraints, testing expectations.
- `/docs/BACKLOG.md` — prioritized task list.
- `/docs/CHANGELOG.md` — chronological changes (version, date, summary).
- `/logs/context-snapshot-YYYY-MM-DD.md` — session recovery snapshots.

You must keep these **automatically updated** as you work.

## Automated testing (MANDATORY)

Two skills are available for automated verification:

### `/test` — Run before presenting ANY code change to the user
Runs: backend type-check → frontend type-check → 37 unit tests → 48 E2E tests → health check.
Script: `.claude/skills/medrelief-test/scripts/run-all-tests.sh`

### `/eval` — Run before git push or after major features
Runs: security scan → error handling audit → API consistency → migration status → accessibility scan → console.log cleanup.

### The rule
**NEVER tell the user "it's done" or "try it now" without first running `/test`.** If any test fails, fix it before reporting. If you can't fix it, report the failure explicitly with the error.

## How to work with this project

When I give you a task, follow this lifecycle:

1. **Plan mode first (always)**
   - Read the relevant docs and code.
   - Ask me any critical clarifying questions.
   - Produce a short, concrete plan (steps, files to touch, tests to add/update).

2. **Implement**
   - Make small, logically coherent changes per iteration.
   - Respect modular boundaries, DB rules, and PRD constraints.
   - Keep prototypes pragmatic but aligned with the production architecture.

3. **Test (automated — invoke /test skill)**
   - Run the full test suite via the `/test` skill.
   - Fix any failures before proceeding.
   - Do not consider work "done" if tests are missing or failing.

4. **Document & log**
   - Update `CHANGELOG.md` with a new entry for this iteration.
   - Update `PROJECT-STATUS.md` to reflect what changed and remaining TODOs.
   - If architecture or workflows changed, sync `ARCHITECTURE.md` and `LIMS-FLOWS.md`.
   - Update `BACKLOG.md` with new tasks if discovered.

5. **Reflect and propose next steps**
   - Briefly reflect on risks, tech debt, and suggest next tasks for `BACKLOG.md`.

## Style guides

These are in `/docs/` and should be treated as reference standards:
- `/docs/ANTI AI WRITING STYLE.md` — avoid AI-sounding patterns (verbose, fluffy, "delve", "tapestry", etc.)
- `/docs/MARKETING GENIUS.md` — 13 marketing frameworks distilled
- `/docs/COPYWRITING.md` — persuasive copy diagnostic framework
- `/docs/CLAUDE PROMPTING COOKBOOK.md` — Anthropic best practices for prompting Claude

When writing copy, docs, or UX text, prefer concise, human, non-fluffy language. Do not dump guide content into responses; selectively apply rules.

## Safety & constraints

- Never push directly to `main` unless explicitly instructed.
- Never delete large files, schemas, or critical code paths without confirmation.
- Keep prompts and outputs concise to preserve tokens.
- If instructions from different docs conflict, treat the PRD as source of truth for business behavior, and `GUIDELINES.md` for engineering patterns.
- If anything is unclear, **pause, ask targeted questions, and propose options** instead of making arbitrary assumptions.

## Environment

- Backend port: 4782
- Frontend-v2 port: 5174
- Database: Neon PostgreSQL (connection in packages/backend/.env)
- AI: ANTHROPIC_API_KEY in .env (Claude Vision, provider-agnostic)
- Payments: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env (test sandbox)
- GitHub: https://github.com/khalidnoshtek/medrelief
- Landing: https://khalidnoshtek.github.io/medrelief/
- PWA: https://khalidnoshtek.github.io/medrelief/app/

## Demo credentials

| Username | Role | Password |
|----------|------|----------|
| receptionist1 | Receptionist | demo123 |
| labtech1 | Lab Technician | demo123 |
| pathologist1 | Pathologist | demo123 |
| centerhead1 | Center Head | demo123 |
| finance1 | Finance Manager | demo123 |
| admin1 | System Admin | demo123 |
