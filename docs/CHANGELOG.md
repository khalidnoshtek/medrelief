# Changelog

## v0.4.0 — 2026-04-09 — Dashboard, Patient History, Platform Features

### Added
- Center Head dashboard: today's revenue, bill count, payment mode breakdown, lab status, pending approvals (auto-refreshes every 30s)
- Patient history page: all visits, bills, test results, reports for a patient
- Keyboard shortcuts: F2 = New Bill, F4 = Focus Payment amount
- Audit trail: bill timeline showing domain events, payments, adjustments with timestamps
- Config settings: tenant/branch-level configuration with 10 default keys (discount limits, rounding, payment modes, alert thresholds)
- Config API: GET /mdm/config, PUT /mdm/config/:key
- Dashboard auto-routes Center Head to /finance/dashboard on login

## v0.3.0 — 2026-04-08 — Finance & Printing

### Added
- Shift open/close with system vs physical count variance calculation
- Daily reconciliation close with revenue summary by payment mode
- DailyBranchCloseCompleted domain event
- Bill receipt print (thermal 80mm PDF format)
- Barcode label print for accession samples (PDF)
- UPI payment stub (generates UPI deep link)
- Daily Close added to receptionist sidebar
- Finance routes: /finance/shifts/*, /finance/daily-close

## v0.2.0 — 2026-04-08 — Report Generation, Billing Enhancements

### Added
- PDF report generation (pdfkit)
- Email dispatch via Nodemailer + Ethereal SMTP
- WhatsApp dispatch stub
- Report viewer page with delivery status, Download PDF, Resend buttons
- Package billing with child test expansion
- Split payment UI (multiple payment modes per bill)
- Bill cancellation with inline reason form (before accession only)
- Credit note / refund via billing_adjustments
- Rate plan price preview in test picker
- Bill detail page with Print Receipt, Print Labels, View Report, View Full History
- Expandable bill list with View Bill, View Report, Cancel Bill actions

### Fixed
- Double discount bug: rate plan discount was applied twice on bill creation
- Pathologist missing lims:create permission
- Prisma transaction timeout on Neon (increased to 15s)
- Axios 401 interceptor redirect loop on login
- Bill cancellation permission (added billing:update to receptionist)

## v0.1.0 — 2026-04-08 — Vertical Slice Prototype

### Added
- Project scaffolding: npm workspaces monorepo, TypeScript, Prisma ORM
- Database schema: 25 tables across 6 modules
- Auth: JWT login, RBAC with 6 roles and 20 permissions
- MDM: Patient CRUD, doctor/test/branch/rate-plan endpoints
- Rate plan resolver: 6-level priority chain with per-test fallback
- Billing: Bill creation with auto-pricing, payment capture
- LIMS: Accession, sample tracking, worklist, result entry, sign-off
- Domain events: BillConfirmed, ResultSignedOff with outbox + handlers
- Seed data: Demo tenant, 2 branches, 20 tests, 5 rate plans, 5 doctors, 6 users
- Frontend: Login, New Visit, Bills, Worklist, Result Entry, Sign-Off
