# Production Plan — Requirements + Evals

**Purpose:** Pair each feature with a requirement file and an eval file. Freeze both before coding.

**Method:** See `../EVAL-STRATEGY.md` for the multi-Claude-model maker-checker workflow.

**Rule:** No code without an eval. No eval without a requirement.

---

## Folder structure

```
docs/prod-plan/
  README.md                      ← this file
  00-template.req.md             ← requirement template (copy for new features)
  00-template.eval.md            ← eval template (copy for new features)
  01-scan-registration.req.md
  01-scan-registration.eval.md
  02-bill-creation.req.md
  02-bill-creation.eval.md
  ...
```

## Naming convention

`NN-<feature-slug>.<type>.md` where:
- `NN` = two-digit feature number, zero-padded, ordered by build sequence.
- `<feature-slug>` = kebab-case, short, descriptive.
- `<type>` = `req` or `eval`.

## Status workflow

Each file carries one of:
- **DRAFT** — work in progress, may change freely.
- **REVIEW** — open for maker-checker review.
- **FROZEN** — signed off, implementation can start.
- **IMPLEMENTED** — code merged, evals passing in CI.

A requirement must be FROZEN before its evals can be frozen. Evals must be FROZEN before code starts.

## Build order (MVP scan-to-report slice)

Starting features for the production build:

1. `01-scan-registration` — scan-first registration (DECISION-01, GAP-03 fallback).
2. `02-patient-verify` — AI-extracted patient details with confidence badges.
3. `03-test-selection` — test catalog search + rate plan resolver.
4. `04-bill-creation` — bill creation + rate plan pricing.
5. `05-payment-razorpay` — Razorpay integration (UPI/Card/Netbanking).
6. `06-accession-auto` — bill-to-accession auto-generation + label print.
7. `07-sample-collection` — lab worklist + sample state machine.
8. `08-result-entry` — result entry + auto-flagging.
9. `09-pathologist-signoff` — sign-off queue.
10. `10-report-generation` — auto-generated reports.
11. `11-whatsapp-delivery` — patient WhatsApp delivery + alternate number fallback.
12. `12-sms-fallback` — SMS fallback when WhatsApp fails.
13. `13-in-app-viewer` — in-app report viewer (replace PDF-first).
14. `14-center-head-dashboard` — dashboard, approvals, daily close.
15. `15-auth-rbac` — 4-tier RBAC + role switching.
16. `16-multi-center` — org hierarchy + center_id scoping.
17. `17-approvals` — approval chains for discount / write-off / refund.
18. `18-notifications` — in-app push + WhatsApp escalation.
19. `19-settlement-rule` — is_settled flag + post-delivery lock.
20. `20-audit-log` — auditability + AI interaction log.

Portal features (added in PRD v3.2, DECISION-14 through DECISION-17):

21. `21-patient-portal-auth` — patient login (mobile + password + WhatsApp OTP reset).
22. `22-patient-portal-reports` — past reports list, PDF download, WhatsApp delivery preference.
23. `23-b2b-users-model` — `b2b_users` table, linkage to doctors + organizations.
24. `24-b2b-portal-auth` — doctor + corporate HR login (same pattern as patient).
25. `25-b2b-portal-referrals` — doctor dashboard, corporate dashboard, consent-gated report viewer.
26. `26-consent-capture-and-revoke` — `patient_consents` table, capture at registration, revoke from patient portal.

Infrastructure features (cross-cutting):

- `90-ai-provider-abstraction` — LLM / Vision / STT provider interface (DECISION-09).
- `91-device-voice-integration` — native OS voice integration (DECISION-10).
- `92-dpdp-compliance` — consent, erasure, retention.
- `93-ai-cost-tracking` — ai_cost_log + budget enforcement.
- `94-ci-cd-pipeline` — eval runner, deployment stages.
- `95-whatsapp-template-registry` — manage approved templates, track reclassifications (DECISION-16).
- `96-otp-service` — shared OTP generator/validator across patient/B2B/staff (DECISION-17).

Renumber as priorities shift. Maintain ordering by prefix.

## When starting a feature

1. Copy `00-template.req.md` to `NN-<feature>.req.md`.
2. Copy `00-template.eval.md` to `NN-<feature>.eval.md`.
3. Fill in the requirement. Status: DRAFT.
4. Draft evals from the requirement. Status: DRAFT.
5. Trigger maker-checker review (see EVAL-STRATEGY.md).
6. Iterate until FROZEN.
7. Implement.

## Remote dev transfer

When spinning up the new production repo on the remote machine:

```bash
# On remote machine, in new repo root:
mkdir -p docs/prod-plan
scp -r <local>/docs/prod-plan/* docs/prod-plan/
scp <local>/docs/EVAL-STRATEGY.md docs/
scp <local>/docs/PRD-SATURDAY-DECISIONS.md docs/
scp <local>/docs/CLAUDE-PRODUCTION.md CLAUDE.md   # becomes the repo CLAUDE.md
```

Adjust paths based on your setup. SCP is one option; git clone + cherry-pick is another.
