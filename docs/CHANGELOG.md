# Changelog

## v0.6.1 — 2026-04-16 — Documentation Sprint + PRD v3.0 + Auth Model

### Added
- Prototype Flow Document (Medrelief-Prototype-Flow.docx): 16 mobile screenshots, end-to-end patient journey across 3 roles
- TimeFlow Auth Flow Document (TimeFlow-Auth-Flow.docx): 13 screenshots, authorization model analysis from Noshtek TimeFlow app
- Prototype Feedback + Additions (PROTOTYPE-FEEDBACK-ADDITIONS.md): 8 sections covering production additions, system model, new features, auth model, DB schema
- Combined Phase 1 Requirements (Medrelief-Phase1-Requirements.docx): standalone doc with all screenshots + additions
- PRD v3.0 (Medrelief_ERP_PRD_v3.0-Phase-1.docx): extends original v2.1 with sections 15-20, 29 embedded screenshots
  - Section 15: Product Definition (prototype = product, AI-first LIMS)
  - Section 16: Production Additions (discount overrides, approval workflows, settlement rule)
  - Section 17: System Additions (transaction model, status taxonomy, auditability)
  - Section 18: New Features (notifications, WhatsApp API, in-app report viewer, conversational AI voice assistant)
  - Section 19: Authorization Model (4-tier RBAC, role switching, multi-center org hierarchy, approval chains, notification routing, DB schema)
  - Section 20: Open Questions + Action Items
- Product vision statement: AI-first LIMS, kiosk-style, Siri/Alexa voice assistant for all roles
- 4 role-specific voice assistant examples (receptionist, lab tech, pathologist, center head)

### Changed
- PRD framing: prototype is the product spec, not just a reference
- Voice assistant scope: all roles (not just receptionist)

## v0.6.0 — 2026-04-14 — Live Deployment + AI Assistant + Dashboard Overhaul

### Added
- Deployed to production: Render (backend) + GitHub Pages (frontend PWA at /app/)
- AI Business Assistant on center head dashboard using real Claude API
  - Handles any freeform question about revenue, bills, tests, doctors, patients, lab status
  - Voice + text input, natural language answers with real DB data
  - Falls back to data extraction if Claude API unavailable
- Center head dashboard: daily operation cards (prev-day pending, today's cases, closed, in-progress)
- Pending cases drill-down page (age badge, progress x/y)
- Daily closing itemized view — clickable history items with ?date= param for any historical day
- Doctor bills page — search doctor → see all referred bills
- Bill detail page: "Collect Payment" retry button for failed/partial payments (Cash + Razorpay)
- Razorpay payment integration (test sandbox, order creation + HMAC verification)
- QR camera scanner on Status page (html5-qrcode)
- QR code embedded in printed bill receipts
- Professional SVG icons (lucide-react) replacing all emojis
- /test and /eval skills for automated testing
- CLAUDE.md with full project context

### Fixed
- Logo redirects to /dashboard for center head (not /home with billing)
- Receipt QR text overlap (cursor now advances past QR image height)
- QR scan → bill page auto-refreshes (refetchOnMount: always)
- Hard refresh SPA routing on GitHub Pages (base path preserved in 404.html redirect)
- Strict doctor name matching (no wrong "Patel" matches)
- Mic button overflow on mobile (shrink-0 + min-w-0)
- Razorpay auth: removed client caching, trim env vars, better error messages
- Helmet CSP disabled on API server (was blocking cross-origin requests)
- CORS whitelist for GitHub Pages + Render origins
- Express body limit 50MB for camera photos
- Prisma pinned to v6.19.3 (v7 breaks schema.prisma syntax)
- Backend uses tsx runtime (no tsc build needed for Render)

## v0.5.0 — 2026-04-14 — AI-First Kiosk Rebuild

### Added
- New frontend-v2 (mobile-first PWA, kiosk UX)
- Camera prescription capture via Claude Vision API
- Voice input via Web Speech API (Hindi/English)
- Doctor auto-match + inline "Add new doctor"
- Doctor-specialty test suggestions
- QR code generation + camera scanner
- Schema: prescription_image_url, extracted_data_json, fasting_status, pregnancy_status, qr_code
- 7 new doctors from Sort March list
- Landing page + GitHub Pages deployment

## v0.4.0 — 2026-04-09

### Added
- Center Head dashboard, patient history
- Keyboard shortcuts, audit trail, config tables
- Shared UI components

## v0.3.0 — 2026-04-08

### Added
- Shift close, daily reconciliation, bill receipt, barcode labels, UPI stub

## v0.2.0 — 2026-04-08

### Added
- PDF reports, email dispatch, WhatsApp stub
- Package billing, split payments, bill cancellation, credit note/refund

## v0.1.0 — 2026-04-08

### Added
- Greenfield: 25 tables, 6 modules, JWT auth, rate plan resolver
- Full vertical slice prototype
