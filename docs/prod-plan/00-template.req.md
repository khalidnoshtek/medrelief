# Feature: <name>

**ID:** FEAT-NN
**Owner:** <role — who owns this feature's outcome>
**Status:** DRAFT
**Models:** drafted by <model>, reviewed by <model>
**Linked PRD sections:** <PRD v3.0 section numbers>
**Linked decisions:** <DECISION-XX from PRD Section 21.1 or PRD-SATURDAY-DECISIONS.md>

---

## 1. Summary
One paragraph. What does this feature do? For whom? Why does it matter?

## 2. User stories
- As a <role>, I want <action> so that <outcome>.
- As a <role>, I want <action> so that <outcome>.

## 3. Functional requirements
Atomic, testable, numbered. Each line must be coverable by at least one eval case.

3.1. <requirement>
3.2. <requirement>
3.3. <requirement>

## 4. Non-functional requirements
4.1. **Performance:** <target, e.g., "p95 latency < 300ms for X endpoint">
4.2. **Security:** <constraint, e.g., "only Receptionist + Center Head roles can access">
4.3. **Accessibility:** <WCAG 2.1 AA minimum; specify any extra>
4.4. **Compliance:** <DPDP Act requirements, medical regulation, audit logging>
4.5. **Observability:** <what gets logged, what gets metered>

## 5. Data model impact
- Tables added: <list>
- Tables modified: <list with columns>
- New enums: <list>
- Migrations: <file names to create>

## 6. API surface
List endpoints added or modified. Include request/response examples.

### POST /api/v1/...
Request:
```json
{ ... }
```
Response (2xx):
```json
{ ... }
```
Errors:
- `XXX_ERROR_CODE` (4xx): <when, what message>

## 7. UI impact
- Screens affected: <list>
- Mobile viewport: <yes/no>
- New components: <list>
- Design reference: <Figma link or prototype screenshot reference>

## 8. AI involvement
Does this feature use AI? If yes:
- **Provider:** <Anthropic / OpenAI / device-native via DECISION-10>
- **Model:** <Claude Sonnet / Vision / etc.>
- **Input:** <what goes to the AI>
- **Output:** <expected structured result>
- **Confidence threshold:** <default 0.7>
- **Fallback (mandatory per DECISION-07):** <what happens when AI fails>
- **Cost:** <per-call estimate, logged to ai_cost_log>

If no: state "No AI involvement."

## 9. Out of scope (explicit)
- <thing this feature does NOT do>
- <thing this feature does NOT do>

## 10. Open questions
- <unresolved question>

Block FREEZE until all questions resolved or explicitly deferred.

## 11. Dependencies
- Depends on features: <list FEAT-NN>
- Depended on by: <list>
- External services: <Razorpay, WhatsApp BSP, etc.>

## 12. Risks
- <risk> → <mitigation>

---

## Review notes

### Reviewer: <model> on <date>
- <finding>
- <finding>

### Revisions by maker
- <change made>

---

## History
- YYYY-MM-DD — DRAFT by <model>
- YYYY-MM-DD — REVIEW by <model>
- YYYY-MM-DD — FROZEN by Khalid
