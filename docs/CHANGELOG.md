# Changelog

## v0.5.0 — 2026-04-14 — AI-First Kiosk + Razorpay + Deployment

### Added
- New `packages/frontend-v2/` — complete mobile-first PWA rebuild (kiosk UX)
- Camera-first new visit flow: capture → AI verify → tests → payment → done with QR
- AI prescription extraction service (Claude Vision via Anthropic API, provider-agnostic with mock fallback)
- Voice input on all fields via Web Speech API (bilingual Hindi/English)
- Doctor auto-match from AI extraction (fuzzy name matching) + "Add new doctor" inline
- Doctor-specialty test suggestions (static mapping: gynecologist → gyn panel, etc.)
- Razorpay payment integration (test sandbox: UPI/Card/Netbanking via checkout popup)
- QR code camera scanner on Status page using html5-qrcode
- QR code embedded in printed bill receipts (scannable for status lookup)
- Center Head dashboard: daily operation section (previous day pending, today's cases, closed, in-progress)
- Pending cases drill-down page (age badge, progress x/y, links to worklist + bill)
- Daily closing itemized view (every bill, payment mode breakdown, gross/discount/net totals)
- Professional SVG icons throughout (lucide-react: replaced all emoji icons)
- Schema additions: prescription_image_url, extracted_data_json, extraction_provider, fasting_status, pregnancy_status, preferred_language, preferred_delivery_channel, qr_code
- New `POST /api/v1/mdm/doctors` — quick-create doctor from AI extraction
- New `POST /api/v1/billing/razorpay/order` + `POST /api/v1/billing/razorpay/verify`
- New `GET /api/v1/finance/pending-cases` + `GET /api/v1/finance/daily-close/itemized`
- 7 doctors added from Sort March list (12 total in system)
- GitHub Pages deployment: landing page + PWA at /app/
- Render blueprint (render.yaml) for one-click backend deploy
- API client supports VITE_API_BASE env for production backend URL
- Polished landing page with "Open app" link at khalidnoshtek.github.io/medrelief/
- Stakeholder brief Word document (docs/Medrelief-Prototype-2.0-Stakeholder-Brief.docx)

### Changed
- Old `packages/frontend/` deleted (superseded by frontend-v2)
- Fasting status defaults to NOT_APPLICABLE (not FASTING/NON_FASTING)
- Express body limit increased to 50MB (for camera photos as base64)
- Camera capture resizes images to max 1600px before upload
- `dotenv.config({ override: true })` to handle system ANTHROPIC_API_KEY env
- AI model configurable via ANTHROPIC_MODEL env (default: claude-haiku-4-5)

### Fixed
- ₹ symbol rendering: replaced `&#8377;` HTML entities with actual Unicode ₹ in JSX
- × close button rendering: replaced `&times;` with actual Unicode ×
- Razorpay SDK loaded on-demand (not bundled)

## v0.4.0 — 2026-04-09 — Dashboard, Patient History, Platform Features

### Added
- Center Head dashboard: revenue, bills, payment mode breakdown, lab status, pending approvals
- Patient history page: all visits, bills, test results, reports
- Keyboard shortcuts: F2 = New Bill, F4 = Focus Payment
- Audit trail: bill timeline (events, payments, adjustments)
- Config settings: tenant/branch-level with 10 default keys
- Shared UI: Spinner, LoadingPage, EmptyState, ErrorBanner, SuccessBanner

## v0.3.0 — 2026-04-08 — Finance & Printing

### Added
- Shift close with variance, daily reconciliation
- Bill receipt print (thermal 80mm PDF with embedded QR)
- Barcode labels with Code 128 (bwip-js)
- UPI payment stub

## v0.2.0 — 2026-04-08 — Reports, Billing Enhancements

### Added
- PDF report generation (pdfkit), email (Nodemailer + Ethereal), WhatsApp stub
- Report viewer with delivery tracking, resend
- Package billing, split payments, bill cancellation, credit note/refund
- Rate plan price preview, bill detail page

### Fixed
- Double discount bug, pathologist permissions, Prisma timeout, login redirect loop

## v0.1.0 — 2026-04-08 — Vertical Slice Prototype

### Added
- Greenfield: 25 tables, 6 modules, JWT auth, rate plan resolver
- Patient → bill → payment → accession → results → sign-off → report
- React frontend, 37 unit + 48 E2E tests
