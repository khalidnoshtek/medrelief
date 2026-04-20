# PRD Saturday Decisions — 18 April 2026

**Supplement to:** `Medrelief_ERP_PRD_v3.0-Phase-1.docx` (frozen as-is).
**Source:** Saturday review call between Khalid Shaikh and Mithlesh Jha.
**Status:** All items below are BINDING unless marked as "research pending."

---

## 1. Engineering Methodology (Mithlesh's directives)

These are how we work, not what we build. Applies to every phase, every feature.

### 1.1 Eval-driven development
- Derive eval test cases **directly from requirements**, before writing code.
- Code is written to pass evals — not the other way around.
- Requirements without evals are not ready to implement.

### 1.2 Two artifacts, co-located
- Product requirement and test requirement are **separate files**, **same folder**, paired.
- Folder structure: `docs/prod-plan/<feature>.req.md` + `docs/prod-plan/<feature>.eval.md`.
- Traceability: every requirement line is referenced by one or more eval cases. Every eval case references its requirement line.

### 1.3 Complete eval coverage
- Produce the **full** eval list for each feature. Not partial, not implicit.
- Categories required: happy path, edge cases, error cases, security, performance, accessibility, AI-specific (low confidence, timeout, wrong output).

### 1.4 Multi-model maker-checker (Claude models only)
- Maker and checker use **different Claude models** (Opus, Sonnet, Haiku) — not different LLM vendors.
- Same-model + same-context = shared blind spots. Different capability tiers = different scrutiny angles.
- See `docs/EVAL-STRATEGY.md` for the full matrix.

### 1.5 Evidence-first debugging
- When anything fails (command, connection, integration): capture **full output + screenshot** and share immediately. No summarizing, no guessing.
- Applies to local dev, staging, and production incidents.

### 1.6 Defer non-essential work
- Core deliverables first: requirements + evals + minimum feature slice.
- Don't build SMS fallback, notifications preferences UI, advanced reports, etc. until the core scan-to-report flow works end-to-end.

---

## 2. New Locked Decisions (extends PRD Section 21.1)

### DECISION-06: `org_centers` replaces `mdm_branches` (resolves GAP-01)
- All transactional tables use `center_id` instead of `branch_id`.
- Sub-centers (collection points) get their own `center_id` with `parent_center_id` pointing to main lab.
- Samples accessioned against parent center.
- Migration SQL written alongside the schema.

### DECISION-07: AI failure = manual fallback, always (resolves GAP-03)
- Every AI-assisted screen has manual entry reachable in **one tap**, always visible.
- OCR confidence below 0.7 → force manual review with low-confidence fields highlighted.
- Voice assistant: always show transcript before form population; user confirms.
- AI service outage → degrade to pure manual. Bill creation never blocks on AI.
- `ai_interactions` audit table logs every call with confidence + cost.

### DECISION-08: Per-user notification preferences (resolves GAP-06)
- `user_notification_preferences` table: `user_id`, `event_type`, `channel`, `enabled`, `quiet_hours_start`, `quiet_hours_end`.
- Role-based defaults seeded on user creation.
- In-app notifications for **urgent** or **critical** priority **cannot be disabled**.
- Non-critical channels (WhatsApp escalation, email) can be opted out per user.

### DECISION-09: AI provider abstraction mandatory (extends GAP-04)
- Build provider-agnostic interfaces from day 1 for: LLM, Vision OCR, Speech-to-Text.
- Any **DPDP-compliant API** can be swapped in via config. No hardcoded Anthropic SDK outside the provider adapter layer.
- Compliance requirement overrides vendor preference.
- Pre-integrate at minimum: Anthropic (current), OpenAI (backup). Other providers added as compliance verified.

### DECISION-10: Device-native voice (extends GAP-05)
- No custom STT server integration for Phase 1.
- Use **device-native voice assistants as gatekeepers**:
  - Android: Google Assistant / Gboard voice input.
  - iOS: Siri / iOS keyboard dictation.
  - Samsung: Bixby.
- User taps form field → device OS handles voice → we receive plain text.
- Claude LLM extracts structured fields from the typed/dictated text (not from audio).
- **Future option:** add server-side STT (Whisper / Google / Sarvam / Bhashini) if accuracy complaints arise. Not Phase 1.

### DECISION-11: WhatsApp scope revised (supersedes DECISION-05)
Earlier decision (patient-only) is **reversed**. New scope:

**Customer (patient) channel:**
- Report delivery: primary channel. WhatsApp utility template (~₹0.11/msg).
- Appointment reminders (Phase 2): WhatsApp utility.

**Internal staff channels:**
- **Login + password reset:** WhatsApp OTP (authentication template, ₹0.145/msg).
- **Normal notifications:** in-app only.
- **Escalation for unread priority notifications past SLA:** WhatsApp reminder to the assigned user.
- **Critical alerts** (not read in-app within SLA): WhatsApp escalation.

**Patient fallback chain when patient has no WhatsApp:**
1. System prompts receptionist: "Send report to alternate WhatsApp number?" (family member, doctor).
2. Receptionist enters alternate number → WhatsApp delivery attempted.
3. If alternate also fails OR receptionist has no alternate → **SMS fallback** (see DECISION-12).

### DECISION-12: SMS provider = MSG91 (primary), Fast2SMS (backup)
- **Primary:** MSG91 — DLT-compliant, medical-grade reliability, ~₹0.15–0.20/SMS.
- **Backup:** Fast2SMS — ₹0.11/SMS starting, for cost arbitrage when MSG91 has issues.
- Both behind the same `sms-provider` interface (DECISION-09 principle).
- Use only for: OTP fallback, report delivery fallback when WhatsApp unavailable.

### DECISION-13: SLA + escalation
- **Discount approval SLA:** 5 minutes. Auto-escalate via in-app push + WhatsApp to next-level approver after 5 min.
- **Commission approval SLA (Phase 2):** 1–2 business days. Auto-reminder at day 1, escalate at day 2.
- **Report delivery SLA:** 10 minutes after sign-off (WhatsApp). Auto-retry with exponential backoff. Escalate to Center Head in-app + WhatsApp after 3 failed attempts.
- **Critical result notification SLA:** 5 minutes. Escalate to Center Head via in-app + WhatsApp if not acknowledged by Pathologist within 5 minutes.
- SLA values live in `config` tables (tenant-overridable), not hardcoded.

---

## 3. Research Pending (non-blocking)

- **Patient portal** scope (Phase 1.5 or later) — whether patients get logins to view past reports.
- **B2B portal** scope — whether referring doctors and corporate HR get logins.
- If yes to either: how does WhatsApp OTP scale given the "authentication template" content restriction (OTP value only, no branding).

Khalid will decide after core scan-to-report flow is live.

---

## 4. WhatsApp / SMS Cost Model (reference)

| Channel | Use case | Cost/msg | Notes |
|---------|----------|----------|-------|
| WhatsApp Utility | Report ready, delivered, reminder | ₹0.11–₹0.145 | Template pre-approval required |
| WhatsApp Authentication | OTP for internal staff login/reset | ₹0.145 | Strict template: OTP code only |
| WhatsApp Service | User-initiated replies | FREE (24hr) | Only if patient messages first |
| WhatsApp Marketing | Promotional (not used in Phase 1) | ₹0.86 | Out of scope |
| SMS OTP (MSG91) | WhatsApp fallback | ₹0.15–₹0.20 | DLT-compliant |
| SMS OTP (Fast2SMS) | Backup provider | ₹0.11 starting | DLT-compliant |

**Estimated monthly WhatsApp cost per center:**
- 60 reports/day × ₹0.11 = ₹6.60/day = **₹198/month per center** (report delivery).
- Internal alerts (escalations only): ~20/day × ₹0.11 = **₹66/month per center**.
- Staff OTP (logins + resets): ~30/month × ₹0.145 = **₹4.35/month per center**.
- **Total: ~₹270/month per center** (2 centers = ~₹540/month).
- SMS fallback usage estimated ~15% of volume: ~₹100/month extra.

---

## 5. Folder Structure for Requirements + Evals

Decided: **Option 2 — paired files per feature, one folder.**

```
docs/prod-plan/
  README.md                      (explains the structure)
  00-template.req.md             (requirement template)
  00-template.eval.md            (eval template)
  01-scan-registration.req.md    (feature: scan-first registration)
  01-scan-registration.eval.md   (eval cases for above)
  02-bill-creation.req.md
  02-bill-creation.eval.md
  03-payment-razorpay.req.md
  03-payment-razorpay.eval.md
  ...
```

**Rationale:**
- Requirement and eval are always opened together. Same folder keeps them linked.
- Filename prefix (`01-`, `02-`) gives ordering.
- Paired naming (`.req.md` / `.eval.md`) makes it grep-friendly.
- When shipping to the remote dev machine, copy the whole `docs/prod-plan/` folder into the new production repo.

See `docs/prod-plan/README.md` for the template specification.

---

## 6. Next Steps

1. **Create `docs/EVAL-STRATEGY.md`** — multi-Claude-model maker-checker workflow and eval categories.
2. **Create `docs/prod-plan/`** with templates and README.
3. **Draft the first 3 requirement + eval pairs** for the MVP scan-to-report slice:
   - `01-scan-registration.req.md` / `.eval.md`
   - `02-bill-creation.req.md` / `.eval.md`
   - `03-payment-razorpay.req.md` / `.eval.md`
4. **Review evals with Mithlesh** before writing code.
5. **Spin up new production repo** on remote dev machine, clone `docs/prod-plan/` into it.
6. **Begin code on first feature** once evals are signed off.

---

## 7. Update to `CLAUDE-PRODUCTION.md`

The production CLAUDE.md template will be updated to include:
- DECISION-06 through DECISION-13.
- Mithlesh's methodology (eval-driven, maker-checker, co-located artifacts).
- Pointer to `docs/EVAL-STRATEGY.md` as mandatory reading before any feature starts.

---

## Document History
- 18 April 2026 — Initial capture of Saturday call decisions and methodology directives.
