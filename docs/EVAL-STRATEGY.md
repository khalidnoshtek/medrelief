# Eval Strategy — Multi-Claude-Model Maker-Checker

**Purpose:** How we write requirements, derive evals, and use different Claude models to catch gaps the same model would miss.

**Scope:** Every feature in Medrelief production. No code without evals. No evals without requirements.

---

## Principles

1. **Evals come first.** Requirement → evals → code. In that order. No exceptions.
2. **Complete coverage.** Every requirement has evals for happy path, edge cases, errors, security, performance, accessibility, and AI-specific failures.
3. **Two files, one folder.** `.req.md` and `.eval.md` are paired. Opened together, reviewed together, committed together.
4. **Maker ≠ checker.** Maker and checker use **different Claude models**. Same-model + same-context = same blind spots.
5. **Evidence before progress.** Evals must pass (or be explicitly waived with reason) before a feature ships.

---

## Claude Model Matrix

We use the Claude model family as distinct "reviewer personas." Same vendor, different capability tiers → different failure modes caught.

| Claude model | Role | Best for | When to use |
|---|---|---|---|
| **Opus 4 (1M ctx)** | Strategic reviewer | Deep reasoning, architecture critique, spotting logical gaps, business logic review | Requirements review, eval completeness check, post-implementation architectural audit |
| **Sonnet 4** | Implementer | Balanced capability, most code generation, test writing, routine requirements drafting | Draft requirements, write code, write evals, run most reviews |
| **Haiku 4.5** | Fast verifier | Speed, basic sanity checks, running tests, checking formatting, quick diff review | Sanity-check eval syntax, run test suites, quick doc updates, session checkpoints |

### Model-switch workflow per feature

```
REQUIREMENT PHASE
  Sonnet:     drafts requirement from PRD + stakeholder notes
  Opus:       reviews requirement for gaps, edge cases, business logic holes
  Sonnet:     revises requirement based on Opus feedback
  Haiku:      sanity-checks formatting, traceability (every req line numbered)
  → freeze requirement

EVAL PHASE
  Sonnet:     drafts eval test cases from requirement (one per req line minimum)
  Opus:       reviews evals for completeness — what scenarios are missing?
  Sonnet:     adds missing evals
  Haiku:      verifies eval format + runs syntax check
  → freeze evals

CODE PHASE
  Sonnet:     writes code to pass evals
  Haiku:      runs eval suite continuously during dev
  Sonnet:     iterates until all evals pass
  Opus:       final architectural review before merge
  → merge

POST-MERGE
  Haiku:      runs full eval suite on CI
  Opus:       quarterly deep audit of accumulated evals for drift
```

### Why this works

- **Different context windows.** Opus has 1M; Sonnet ~200K; Haiku smaller. Different slices of the codebase in memory → different patterns spotted.
- **Different training emphasis.** Haiku optimized for speed and simple tasks; Sonnet for balance; Opus for depth. Same prompt, different outputs.
- **Cost-optimized.** Haiku runs the volume work (CI, sanity checks). Sonnet does the 80% that needs balance. Opus reserved for the 20% that needs depth.
- **Traceable.** Every eval run logged with which model generated it and which reviewed it. If a bug escapes, we know which pair missed it.

---

## Requirement File Template (`.req.md`)

```markdown
# Feature: <name>

**ID:** FEAT-NN
**Owner:** <role>
**Status:** DRAFT | REVIEW | FROZEN | IMPLEMENTED
**Models:** drafted by <model>, reviewed by <model>
**Linked PRD sections:** <section numbers from PRD v3.0>

## 1. Summary
One paragraph: what this feature does, for whom, why.

## 2. User stories
- As a <role>, I want <action> so that <outcome>.

## 3. Functional requirements
Numbered list. Each line atomic and testable.
3.1. <requirement>
3.2. <requirement>
...

## 4. Non-functional requirements
4.1. Performance: <target>
4.2. Security: <constraint>
4.3. Accessibility: <WCAG level>
4.4. Compliance: <DPDP / medical regulation>

## 5. Data model impact
Tables touched, new columns, new enums, migrations needed.

## 6. API surface
Endpoints added/modified. Request/response examples.

## 7. UI impact
Screens affected. Link to Figma or screenshot if exists.

## 8. AI involvement
Which AI features are used. Fallback path. Confidence thresholds.

## 9. Out of scope
Explicit list of what this feature does NOT do.

## 10. Open questions
Anything unresolved. Blocks freeze.
```

---

## Eval File Template (`.eval.md`)

```markdown
# Evals: <feature name>

**Linked requirement:** <file-path>.req.md
**ID:** EVAL-NN
**Status:** DRAFT | REVIEW | FROZEN
**Models:** drafted by <model>, reviewed by <model>
**Coverage target:** 100% of requirement lines

## Categories

### Happy path
EVAL-NN.HP.01 — <description>
- Setup: <state>
- Action: <user/api action>
- Expected: <outcome>
- Covers req: 3.1

### Edge cases
EVAL-NN.EC.01 — empty input
- Setup: ...
- Action: ...
- Expected: <specific error message>
- Covers req: 3.1, 4.2

### Error cases
EVAL-NN.ER.01 — DB unreachable
- Setup: simulate DB timeout
- Action: user submits form
- Expected: 503 with correlation_id; UI shows retry banner
- Covers req: 4.2

### Security
EVAL-NN.SE.01 — unauthorized role
- Setup: authenticate as Receptionist
- Action: attempt to access Admin endpoint
- Expected: 403 + audit log entry
- Covers req: auth section

### Performance
EVAL-NN.PF.01 — list pagination
- Setup: 10k records seeded
- Action: GET /list?limit=20
- Expected: response < 300ms, paginated correctly
- Covers req: 4.1

### Accessibility
EVAL-NN.AX.01 — keyboard navigation
- Setup: form rendered
- Action: Tab through all controls
- Expected: focus visible, logical order, all reachable
- Covers req: 4.3

### AI-specific
EVAL-NN.AI.01 — low confidence OCR
- Setup: prescription image with illegible text
- Action: user taps Scan
- Expected: confidence < 0.7 flagged, manual review forced, original image shown
- Covers req: section 8

EVAL-NN.AI.02 — AI service down
- Setup: mock Anthropic API returns 503
- Action: user taps Scan
- Expected: banner "AI unavailable, enter manually"; manual entry works
- Covers req: section 8

EVAL-NN.AI.03 — wrong extraction
- Setup: prescription for "Ramesh" but OCR returns "Rajesh"
- Action: user reviews verify screen
- Expected: user can edit field; original image always visible for comparison
- Covers req: section 8

## Summary
- Total evals: NN
- Required to pass: NN (100% for freeze)
- Waivers: <list with reason + approver>
```

---

## Eval Categories Checklist (mandatory)

Every `.eval.md` must have at least one eval in each category below:

- [ ] **Happy path** — normal successful flow
- [ ] **Edge cases** — empty, maximum, minimum, boundary
- [ ] **Error cases** — invalid input, network failure, DB failure, timeout
- [ ] **Security** — unauthorized access, SQL injection, XSS, CSRF, PII leak
- [ ] **Performance** — latency target, throughput target, pagination
- [ ] **Accessibility** — keyboard nav, screen reader, contrast, focus
- [ ] **AI-specific** (if feature uses AI) — low confidence, service down, wrong output, cost overrun

If a category legitimately doesn't apply, state "N/A — <reason>" under that category. No silent skipping.

---

## Traceability Rule

Every functional requirement line must be covered by at least one eval case.
Every eval case must reference the requirement line(s) it covers.

Tool (future): a script that parses `.req.md` and `.eval.md` pairs and reports:
- Requirement lines without eval coverage.
- Eval cases referencing non-existent requirement lines.
- Evals in the wrong pair (referencing a different req file).

---

## Review Process

Before a feature is "frozen" (ready to implement):

1. Sonnet drafts `.req.md` and `.eval.md`.
2. Opus reviews both. Writes findings at the top of the file under `## Review notes (Opus)`.
3. Sonnet addresses findings.
4. Haiku runs format check + traceability check.
5. Khalid (human) signs off by changing status to `FROZEN`.

Before a feature is "merged":

1. All evals pass (automated).
2. Opus does architectural review of the code against the requirement.
3. Haiku runs the full eval suite on CI.
4. Khalid reviews the PR.

---

## Tooling (to build)

- [ ] `scripts/eval-check.sh` — runs all evals in `docs/prod-plan/*.eval.md`.
- [ ] `scripts/req-eval-trace.py` — verifies every req line has an eval + vice versa.
- [ ] `scripts/run-model.sh <model> <file>` — invokes specified Claude model on a file.
- [ ] CI pipeline: on every PR, run the three above + unit/integration tests.

---

## Anti-patterns to avoid

1. **Writing code before evals.** If tempted, stop and write the eval first.
2. **Same model, multiple passes.** Switching Sonnet to Sonnet is not maker-checker. Switch the model tier.
3. **Partial eval lists.** "We'll add more later" means "we won't add more." Complete it now.
4. **Evals without requirements.** If there's no req line to cover, the eval doesn't belong.
5. **Silently skipping categories.** Explicitly state N/A with reason or add an eval.
6. **Mixing req and eval in one file.** They must be separate. Two files, same folder.

---

## References

- PRD v3.0: `Medrelief_ERP_PRD_v3.0-Phase-1.docx`
- Saturday decisions: `docs/PRD-SATURDAY-DECISIONS.md`
- Production CLAUDE.md: `docs/CLAUDE-PRODUCTION.md`
- Prod-plan folder: `docs/prod-plan/`

---

## Document History
- 18 April 2026 — Initial draft based on Mithlesh's directives from Saturday call.
