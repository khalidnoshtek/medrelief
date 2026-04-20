# Evals: <feature name>

**Linked requirement:** `NN-<feature>.req.md`
**ID:** EVAL-NN
**Status:** DRAFT
**Models:** drafted by <model>, reviewed by <model>
**Coverage target:** 100% of functional requirement lines

---

## Coverage summary
- Functional requirements covered: NN of NN (target 100%)
- Non-functional requirements covered: <list>
- Waivers: <list with reason + approver>

---

## Categories

### Happy path

#### EVAL-NN.HP.01 — <short description>
- **Setup:** <initial state, seeded data, authenticated role>
- **Action:** <user or API action>
- **Expected:** <specific outcome, status code, UI state, DB state>
- **Covers:** req 3.1, 3.2

#### EVAL-NN.HP.02 — <...>
- Setup: ...
- Action: ...
- Expected: ...
- Covers: ...

### Edge cases

#### EVAL-NN.EC.01 — empty input
- Setup: ...
- Action: submit form with empty required field
- Expected: inline validation error, field highlighted, form not submitted
- Covers: req 3.X

#### EVAL-NN.EC.02 — maximum input length
- Setup: ...
- Action: submit with field at 10,000 characters
- Expected: truncation or specific error, no crash
- Covers: req 3.X

#### EVAL-NN.EC.03 — special characters / unicode
- Setup: ...
- Action: submit with emoji, Hindi, zero-width chars
- Expected: stored correctly, rendered correctly
- Covers: req 3.X

### Error cases

#### EVAL-NN.ER.01 — DB unreachable
- Setup: simulate DB connection timeout
- Action: user submits form
- Expected: 503 response with correlation_id; UI shows retry banner; no data loss
- Covers: req 4.2

#### EVAL-NN.ER.02 — external service failure
- Setup: mock external API (Razorpay/WhatsApp/etc.) returns 500
- Action: ...
- Expected: user-facing message, logged failure, retry option
- Covers: req 4.X

#### EVAL-NN.ER.03 — concurrent edit conflict
- Setup: two users editing same entity
- Action: user B saves after user A
- Expected: 409 with VERSION_CONFLICT; UI forces reload
- Covers: optimistic locking req

### Security

#### EVAL-NN.SE.01 — unauthorized role access
- Setup: authenticate as <role without permission>
- Action: attempt the restricted action
- Expected: 403; audit log entry; no state change
- Covers: req 4.2

#### EVAL-NN.SE.02 — SQL injection attempt
- Setup: ...
- Action: input contains SQL fragment
- Expected: safely escaped or rejected; no DB impact
- Covers: req 4.2

#### EVAL-NN.SE.03 — cross-tenant data leak
- Setup: authenticated as tenant A user
- Action: query with tenant B's entity ID
- Expected: 404 or 403; not 200; no data leaked
- Covers: req 4.2

#### EVAL-NN.SE.04 — PII in logs
- Setup: perform normal operation
- Action: inspect application logs
- Expected: mobile number masked, email masked, no auth tokens
- Covers: PRD Section 13.1

### Performance

#### EVAL-NN.PF.01 — p95 latency
- Setup: 10k records seeded, 100 concurrent users simulated
- Action: GET <list endpoint>
- Expected: p95 < 300ms, p99 < 500ms
- Covers: req 4.1

#### EVAL-NN.PF.02 — pagination correctness
- Setup: 10k records
- Action: fetch pages of 20
- Expected: no duplicates, no gaps, stable ordering
- Covers: req 4.1

### Accessibility

#### EVAL-NN.AX.01 — keyboard navigation
- Setup: form rendered
- Action: Tab through all controls
- Expected: focus visible, logical order, no traps, all interactive elements reachable
- Covers: req 4.3

#### EVAL-NN.AX.02 — screen reader labels
- Setup: form rendered with aXe audit
- Action: run aXe automated scan
- Expected: zero critical violations, all inputs labeled
- Covers: req 4.3

#### EVAL-NN.AX.03 — touch target size
- Setup: mobile viewport 390x844
- Action: measure all tap targets
- Expected: all buttons >= 44x44 px
- Covers: PRD Section 2.2

### AI-specific (if feature uses AI)

If this feature has no AI involvement, replace this whole section with:
> N/A — feature does not use AI.

#### EVAL-NN.AI.01 — low confidence output
- Setup: input that produces low-confidence AI output (confidence < 0.7)
- Action: user triggers AI action
- Expected: low-confidence fields highlighted, manual review forced, AI output editable
- Covers: req 8, DECISION-07

#### EVAL-NN.AI.02 — AI service down
- Setup: mock AI provider API returns 503
- Action: user triggers AI action
- Expected: graceful degradation banner "AI unavailable, enter manually", manual entry works, no form block
- Covers: req 8, DECISION-07

#### EVAL-NN.AI.03 — AI returns wrong output
- Setup: AI returns structurally valid but semantically wrong data
- Action: user reviews on verify screen
- Expected: user can override every extracted field, original source visible for comparison
- Covers: req 8

#### EVAL-NN.AI.04 — AI cost logging
- Setup: AI provider call
- Action: complete AI-assisted action
- Expected: row inserted in ai_cost_log with provider, tokens, cost, latency, confidence
- Covers: DECISION-09

#### EVAL-NN.AI.05 — AI budget hard-fail
- Setup: tenant at 100% of monthly AI budget
- Action: user triggers AI action
- Expected: action blocked, message "budget exceeded, contact Super Admin", manual entry still works
- Covers: GAP-05

#### EVAL-NN.AI.06 — PII in AI prompts
- Setup: intercept outgoing AI calls
- Action: user triggers AI action
- Expected: mobile/email masked in prompt unless task requires them, logged with masking status
- Covers: PRD Section 13.1

---

## Additional evals as needed

Add more categories if relevant (offline mode, concurrency, i18n, etc.). Each eval must reference which req line it covers.

---

## Review notes

### Reviewer: <model> on <date>
- Missing: <gap caught>
- Redundant: <duplicate eval>
- Unclear: <ambiguous expected outcome>

### Revisions by maker
- Added EVAL-NN.XX.YY to cover req 3.N
- Clarified expected outcome in EVAL-NN.ZZ.NN

---

## History
- YYYY-MM-DD — DRAFT by <model>
- YYYY-MM-DD — REVIEW by <model>
- YYYY-MM-DD — FROZEN by Khalid
- YYYY-MM-DD — IMPLEMENTED (all evals passing in CI)
