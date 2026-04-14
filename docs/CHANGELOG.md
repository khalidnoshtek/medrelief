# Changelog

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
