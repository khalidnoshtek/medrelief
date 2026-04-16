# Prototype Feedback + Phase 1 Additions

**Source:** Stakeholder review, 16 April 2026
**Status:** Capture only. Not scheduled. Will be merged into the Phase 1 requirements document.
**Companion:** See `docs/Medrelief-Prototype-Flow.docx` for the current v0.6.0 walkthrough these additions build on.

---

## 1. Production Additions (behavior to enforce in prod)

- **Override discount at report collection.** Even when an agreed bill amount exists, allow a receptionist (or authorized role) to apply a discount — but only before report delivery. After delivery, discounts are locked.
- **Approval workflow on override discount.** No direct bill amendment without approvals. The discount request routes through the approval chain, and only the approver can commit the change.
- **Post-settlement: write-off only, not discount.** Once the report is delivered or the bill is settled, the only permitted adjustment is a write-off. Discount edits must be blocked at the API/UI layer.
- **Rural / low-balance case.** Support a "discount at pickup" path for hardship scenarios (example: ₹450 still pending at report collection). Routed via the same approval workflow as any other override.

## 2. System Additions (core model + tracking to build)

- **Transaction-level identifier.** Assign a `document_id` (or `transaction_id`) per invoice. Treat each invoice as "one transaction" — the canonical unit for end-to-end tracking, audits, and reporting.
- **Main status + sub-status per transaction.** Every transaction carries a top-level state plus an operational sub-state. Enables fine-grained tracking without proliferating top-level statuses.
- **Payment status taxonomy.**
  - `PAYMENT_IN_PROGRESS`
  - `PARTIAL_PAYMENT`
  - `FULL_PAYMENT`
  - (Add `REFUND_IN_PROGRESS` / `REFUNDED` / `WRITTEN_OFF` when modelled.)
- **Report status tracking.** Cover the full lifecycle:
  - `REPORT_GENERATED`
  - `REPORT_COLLECTED` (physical pickup at counter)
  - `REPORT_DELIVERED` (handed to patient)
  - `REPORT_SENT_WHATSAPP`
  - (Add `REPORT_SENT_EMAIL`, `REPORT_SENT_SMS`, `REPORT_DELIVERY_FAILED` as channels expand.)
- **Settlement rule.** A bill is **not** settled until the report is delivered. Gate all permission checks, locks, and automations on this rule — not on payment alone.

## 3. Feature Requests / Enhancements

- **Document capture + AI, end-to-end status view.** Every captured document (prescription, bill, report) exposes its complete status flow — receipt of payment, sample state, report state, delivery state — in one consolidated timeline.
- **Auditability on amendments.** Every bill amendment (discount, write-off, override) records: who requested, who approved, what changed, when, why. Surfaced in the document timeline and in an audit log.

## 4. Action Items (Khalid)

- Create `document_id` + transaction model for invoice-level tracking.
- Design the main-status + sub-status flow (cover payment, sample, report).
- Define payment sub-statuses: `PAYMENT_IN_PROGRESS` / `PARTIAL_PAYMENT` / `FULL_PAYMENT`.
- Define report sub-statuses: `REPORT_COLLECTED` / `REPORT_DELIVERED` / `REPORT_SENT_WHATSAPP`.
- Draft the override-discount-at-pickup workflow: trigger → approval routing → apply → audit.
- **Saturday review prep:** bring proposed transaction status flow + sample screens/flow diagrams for walkthrough.

## 5. Insights / Considerations / Open Questions

- **Discount vs write-off policy.** Draw the line clearly: discount = pre-delivery, approvals required; write-off = post-settlement only. Document the exact transition point.
- **Permissions + gating.** Who can *initiate* the override discount at report collection? Who *approves*? Likely: receptionist initiates, center head approves — confirm with ops.
- **Definition of "settled".** Teams need a single answer: is settlement tied to payment, report delivery, or both? Current intent: **report delivery is the gating event**.
- **Bill amendment controls.** Field teams have historically amended bills informally at pickup. The new workflow must block that route while still letting legitimate hardship cases through (via approvals, not side channels).
- **Status completeness.** Is `WhatsApp sent` enough? Likely need to model re-send, failed delivery, SMS, email — with retry + alert semantics.

---

## 6. New Features Added by Khalid (this session)

### 6.1 Role-based notification system

Every role gets notifications scoped to their authorization and responsibilities.

- **Receptionist:** report ready for collection; payment received; discount approval decisions.
- **Lab technician:** new sample collected; sample transferred to lab; processing reminders.
- **Pathologist:** new completed result awaiting sign-off; amendments requested.
- **Center head:** discount/override approval requests; daily close pending; exceptions (critical flags, failed deliveries).
- **Finance manager:** reconciliation mismatches; end-of-day close checklist; refund requests.

Open questions:
- Channels — in-app push only, or WhatsApp/email too? Default: in-app + WhatsApp for urgent.
- Read receipts / dismissal semantics.
- Notification grouping to avoid noise (e.g., one digest per X minutes for non-critical items).
- Escalation path when a role ignores a notification past SLA.

### 6.2 WhatsApp API integration (customer-facing only)

- WhatsApp is a **delivery channel for patient-facing communication only** — not internal staff comms.
- Primary recipient: the registered patient mobile.
- **Additional WhatsApp field** on patient or bill: optional secondary number (family member, referring doctor) that overrides or adds to the default mobile for report delivery.
- Scope in v1: report delivery. Later: appointment reminders, payment receipts, discount approvals.

Open questions:
- Which WhatsApp Business API provider — Meta Cloud API direct, Gupshup, AiSensy, WATI? Cost + compliance decides.
- Template approval pipeline (WhatsApp requires pre-approved templates for outbound).
- Opt-in capture at registration (regulatory).
- Per-number delivery logs separate from the primary recipient's log.

### 6.3 In-app report viewer (replace PDF-first download)

When a receptionist clicks PDF / Report today, a PDF downloads. Change this.

- **Default action:** open an in-app report view — system-rendered, not a PDF — inside a modal or dedicated page.
- From that view, the user can: **Download PDF**, **Send via WhatsApp**, **Email**, **Print label**, **Close**.
- Report view reads from the same data model as the PDF renderer (single source of truth).
- Works offline-tolerant (critical for rural branches): cached last-generated view if backend is unreachable.

Open questions:
- Mobile vs desktop layout — two templates or one responsive view?
- Copy-protection / watermark on the rendered view (if concerns about sharing unreleased reports).
- How does this interact with pathologist amendments after first view? Version indicator needed.

### 6.4 Conversational AI voice assistant (replace per-field voice input)

Today's UI has voice-input buttons on each field. Replace with a single, continuous voice assistant — Siri / Alexa / Bixby style.

- User taps once; assistant listens to a natural sentence ("patient name is Ramesh Kumar, age 42, male, mobile 9876543210, referred by Dr. Mithlesh, CBC and lipid profile").
- Speech-to-text → LLM extracts structured fields → populates the form → user confirms.
- **Language support:** Hindi + English (with code-switching common in Indian clinics). Roman-Hindi ("marij ka naam Ramesh hai") should work too.
- Runs on the existing Claude Vision / Haiku stack or with a dedicated STT provider (Whisper / Google) + Claude for extraction.

Open questions:
- STT provider — Whisper API (accurate, English+Hindi), Google Speech-to-Text, Sarvam AI (India-native, cheaper), or Bhashini? Cost per minute + accuracy on medical vocab decides.
- Wake word vs tap-to-talk — tap-to-talk is simpler + privacy-safer.
- Confidence display per field (reuse the current AI confidence badge pattern).
- Offline fallback for low-connectivity branches.
- Privacy + consent — patient data spoken aloud in a public reception area; capture ambient audio only between tap-to-start and tap-to-stop.

---

## 7. Authorization Model + Multi-Center Org Hierarchy

**Source:** TimeFlow app (ntapp01-d432c.web.app) — 5 admin/profile screenshots analyzed. Flow cloned, not UI.

### 7.1 What TimeFlow does (reference model)

TimeFlow uses a **3-tier role hierarchy** with in-app role switching:

| Role | Description | Visible tabs | Key permissions |
|------|-------------|-------------|-----------------|
| **Administrator** | Full system access | Timesheets, Leave, **Admin**, Profile | Manage users (active/block), manage MDM (activities, leave types, holidays, clients, countries), see all timesheets, approve anything |
| **Manager** | Review team timesheets | Timesheets, Leave, Profile | See team submissions, approve/reject timesheets, no Admin tab |
| **Employee** | Submit & track hours | Timesheets, Leave, Profile | See/edit own timesheets only |

Key patterns observed:
- **Role switching on Profile page.** A user assigned Administrator can "step down" to Manager or Employee view — same session, different permissions. Useful for testing and for admin staff who also do operational work.
- **User status: Active / Blocked.** Soft-disable, not delete. Blocked users can't log in but their data is retained (audit trail).
- **Admin Panel is a master-data console.** Users, Leave Types, Countries, Holidays, Clients, Activities — all managed here. Only visible to Administrator role.
- **Approval workflow on timesheets.** Submissions flow through approval. Admin sees all approvals across all users.
- **Notification bell (9+ badge).** Role-scoped — admin sees discount/override/exception alerts, staff sees task-relevant pings.

### 7.2 Medrelief authorization model (what to build)

Medrelief's domain is more complex than TimeFlow: multi-center diagnostic labs with clinical workflows, approval chains on financial actions, and regulatory traceability. The model below maps TimeFlow's patterns to Medrelief's reality.

#### Role hierarchy (4 tiers, not 3)

| Level | Role | Scope | Description |
|-------|------|-------|-------------|
| L0 | **Super Admin** | Org-wide (all centers) | System configuration, org structure, user management, rate plans, global MDM. Equivalent to TimeFlow's Administrator but spans the entire Medrelief tenant. |
| L1 | **Center Head** | Assigned center(s) | Full operational authority within their center. Approves discounts, overrides, daily close. Can be assigned to one or multiple centers. |
| L2 | **Department Lead** | Department within center | Senior lab tech or senior receptionist. Review capability, shift oversight, escalation receiver. Optional tier — skip if the center is small. |
| L3 | **Staff** | Role-specific within center | Receptionist, Lab Technician, Phlebotomist, Pathologist, Finance Manager. Each has a fixed permission set scoped to their function. |

#### Permission matrix

| Action | Super Admin | Center Head | Dept Lead | Receptionist | Lab Tech | Pathologist | Finance |
|--------|:-----------:|:-----------:|:---------:|:------------:|:--------:|:-----------:|:-------:|
| Manage org structure | ✓ | — | — | — | — | — | — |
| Manage users (create/block) | ✓ | Within center | — | — | — | — | — |
| Manage MDM (tests, doctors, rate plans) | ✓ | View | — | — | — | — | — |
| Register patient / create visit | ✓ | ✓ | — | ✓ | — | — | — |
| Create bill / collect payment | ✓ | ✓ | — | ✓ | — | — | — |
| Apply discount (pre-delivery) | ✓ | Approve | — | Request | — | — | — |
| Apply write-off (post-settlement) | ✓ | Approve | — | Request | — | — | Request |
| Collect / process sample | ✓ | ✓ | ✓ | — | ✓ | — | — |
| Enter result | ✓ | — | ✓ | — | ✓ | — | — |
| Sign-off result | ✓ | — | — | — | — | ✓ | — |
| View reports | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Send report (WhatsApp/Email) | ✓ | ✓ | — | ✓ | — | ✓ | — |
| Daily close / reconciliation | ✓ | ✓ | — | — | — | — | ✓ |
| View audit logs | ✓ | ✓ | — | — | — | — | ✓ |
| Approve discount override | ✓ | ✓ | — | — | — | — | — |
| Configure notifications | ✓ | — | — | — | — | — | — |

#### Role switching (clone from TimeFlow)

- A user's profile shows their **current active role** and a **Switch Role** section listing all roles they're authorized for.
- Example: Dr. Meena Singh is both Pathologist (L3) and Center Head (L1) at Bihar Sharif. She can switch between them. When in Center Head mode, she sees the Admin panel; when in Pathologist mode, she sees Sign-Off + Worklist only.
- Role switch is session-scoped. Does not require re-login.
- Audit logs always record **the role active at the time of the action**, not just the user ID.

### 7.3 Multi-center org hierarchy

Medrelief operates across multiple physical locations. The org model must support this natively.

```
Tenant: Medrelief
├── Region: Bihar (optional grouping layer)
│   ├── Center: Bihar Sharif Main Lab
│   │   ├── Sub-center: Bihar Sharif Collection Point A
│   │   └── Sub-center: Bihar Sharif Collection Point B
│   └── Center: Madhubani Main Lab
│       ├── Sub-center: Madhubani Collection Point 1
│       └── Sub-center: Madhubani Collection Point 2
└── Region: ... (future expansion)
```

**Rules:**
- **Centers** are the primary operational unit. Each has its own users, rate plans (can inherit from tenant defaults), inventory, daily close, and billing.
- **Sub-centers** are collection-only or partial-test sites. Samples collected there are accessioned under the parent center. Sub-centers share the parent's accession numbering but have their own collection logs.
- **Region** is an optional grouping for reporting. No functional gating — it's a label for dashboards and multi-center reports.
- **Cross-center access.** Some roles (roving pathologist, super admin, finance auditor) are assigned to multiple centers. Their data access spans all assigned centers. A center head managing two centers sees consolidated dashboards.
- **Tenant-level MDM.** Test catalogs, doctor master, rate plan templates are managed at the tenant level. Centers can override prices (branch-specific rate plans) but not the test definition itself.

### 7.4 Proposed DB schema (tables + relationships)

```sql
-- Org hierarchy
CREATE TABLE org_tenants (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,          -- "Medrelief"
  slug VARCHAR UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',    -- global config
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

CREATE TABLE org_regions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES org_tenants NOT NULL,
  name VARCHAR NOT NULL,          -- "Bihar"
  code VARCHAR NOT NULL,
  UNIQUE(tenant_id, code)
);

CREATE TABLE org_centers (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES org_tenants NOT NULL,
  region_id UUID REFERENCES org_regions,  -- nullable for flat orgs
  name VARCHAR NOT NULL,          -- "Bihar Sharif Main Lab"
  code VARCHAR NOT NULL,          -- "BSF-MAIN"
  center_type VARCHAR NOT NULL DEFAULT 'MAIN_LAB',  -- MAIN_LAB | COLLECTION_POINT
  parent_center_id UUID REFERENCES org_centers,     -- nullable; set for sub-centers
  address JSONB,
  settings JSONB DEFAULT '{}',    -- center-level overrides (rate plans, hours)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

-- Roles + permissions
CREATE TABLE auth_roles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES org_tenants NOT NULL,
  code VARCHAR NOT NULL,          -- SUPER_ADMIN, CENTER_HEAD, DEPT_LEAD, RECEPTIONIST, etc.
  name VARCHAR NOT NULL,
  level INT NOT NULL,             -- 0=super admin, 1=center head, 2=dept lead, 3=staff
  description VARCHAR,
  permissions JSONB NOT NULL,     -- ["user:manage", "bill:create", "discount:approve", ...]
  is_system BOOLEAN DEFAULT false, -- true = cannot delete (seed roles)
  UNIQUE(tenant_id, code)
);

-- User ↔ Role ↔ Center assignment (many-to-many-to-many)
CREATE TABLE auth_user_assignments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth_users NOT NULL,
  role_id UUID REFERENCES auth_roles NOT NULL,
  center_id UUID REFERENCES org_centers NOT NULL,  -- scopes role to a center
  is_primary BOOLEAN DEFAULT false,  -- default role on login
  is_active BOOLEAN DEFAULT true,    -- soft-disable without removing
  assigned_by UUID REFERENCES auth_users,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id, center_id)
);

-- User table extension (adds to existing auth_users)
-- New columns: status (ACTIVE/BLOCKED), last_active_role_id, last_active_center_id

-- Approval chains
CREATE TABLE approval_chains (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES org_tenants NOT NULL,
  action_type VARCHAR NOT NULL,   -- DISCOUNT_OVERRIDE, WRITE_OFF, BILL_AMENDMENT, REFUND
  center_id UUID REFERENCES org_centers,  -- null = tenant-wide default
  steps JSONB NOT NULL,           -- [{level: 1, role_code: "CENTER_HEAD", required: true}]
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE approval_requests (
  id UUID PRIMARY KEY,
  chain_id UUID REFERENCES approval_chains NOT NULL,
  entity_type VARCHAR NOT NULL,   -- "bill", "payment", "report"
  entity_id UUID NOT NULL,        -- FK to the bill/payment/etc.
  requested_by UUID REFERENCES auth_users NOT NULL,
  requested_role VARCHAR NOT NULL, -- role active at time of request
  center_id UUID REFERENCES org_centers NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, EXPIRED
  current_step INT DEFAULT 0,
  metadata JSONB,                 -- discount amount, reason, etc.
  created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ
);

CREATE TABLE approval_decisions (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES approval_requests NOT NULL,
  step INT NOT NULL,
  decided_by UUID REFERENCES auth_users NOT NULL,
  decided_role VARCHAR NOT NULL,
  decision VARCHAR NOT NULL,      -- APPROVED, REJECTED
  comment TEXT,
  decided_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.5 Notification routing (linked to roles + scope)

Notifications are triggered by domain events and routed based on the recipient's **role + center assignment**.

| Event | Recipient role(s) | Channel | Priority |
|-------|-------------------|---------|----------|
| Report ready for collection | Receptionist (same center) | In-app | Normal |
| New sample pending collection | Lab Tech (same center, same dept) | In-app | Normal |
| Result awaiting sign-off | Pathologist (same center) | In-app + push | High |
| Discount override requested | Center Head (same center) | In-app + WhatsApp | High |
| Discount approved/rejected | Requesting Receptionist | In-app | Normal |
| Daily close pending (past 8 PM) | Center Head + Finance (same center) | In-app + WhatsApp | High |
| Critical result flag (CRITICAL) | Pathologist + Center Head | In-app + WhatsApp + push | Urgent |
| Report delivery failed | Receptionist + Center Head | In-app | High |
| Payment reconciliation mismatch | Finance (same center) | In-app | High |
| New user added to center | Center Head (same center) | In-app | Low |

Notification storage:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  center_id UUID,                 -- null = org-wide
  recipient_user_id UUID NOT NULL,
  recipient_role VARCHAR,
  event_type VARCHAR NOT NULL,    -- matches the event table above
  title VARCHAR NOT NULL,
  body TEXT,
  entity_type VARCHAR,            -- "bill", "accession", "approval_request"
  entity_id UUID,
  channel VARCHAR NOT NULL,       -- IN_APP, WHATSAPP, EMAIL, PUSH
  status VARCHAR DEFAULT 'UNREAD', -- UNREAD, READ, DISMISSED
  priority VARCHAR DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

### 7.6 How this differs from TimeFlow

| Dimension | TimeFlow | Medrelief |
|-----------|----------|-----------|
| Role tiers | 3 (Admin/Manager/Employee) | 4 (Super Admin/Center Head/Dept Lead/Staff) |
| Org hierarchy | Flat (single company) | Nested (Tenant → Region → Center → Sub-center) |
| Scope | All users see same org | Role scoped to assigned center(s) |
| Approval workflows | Timesheets only | Discounts, write-offs, bill amendments, refunds |
| Role switching | Yes (Profile page) | Yes (clone from TimeFlow, add center switching) |
| User states | Active/Blocked | Active/Blocked/Suspended (add temp suspension) |
| Master data | Activities, Leave Types, Holidays | Test catalog, Doctors, Rate plans, Centers, Departments |
| Notifications | Badge count only | Full event-driven, multi-channel, role-scoped |

---

## 8. More to come

Khalid will add more feature requests here. This document is intentionally append-friendly — new sections under new H2 headings. Will be consolidated into the Phase 1 requirements doc once the full list is captured.

---

## Appendix — cross-references

- Current LIMS flows: `docs/LIMS-FLOWS.md`
- Prototype walkthrough (visual): `docs/Medrelief-Prototype-Flow.docx`
- Architecture: `docs/ARCHITECTURE.md`
- Backlog: `docs/BACKLOG.md` (items here that get scheduled will land there)
