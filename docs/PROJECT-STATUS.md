# Project Status

## Current State: v0.5.0 — AI-First Kiosk + Razorpay + Deployment

**Date**: 2026-04-14

## Live URLs

| URL | What |
|---|---|
| https://khalidnoshtek.github.io/medrelief/ | Landing page |
| https://khalidnoshtek.github.io/medrelief/app/ | Frontend PWA (needs deployed backend) |
| https://github.com/khalidnoshtek/medrelief | Source repo |

## What's Done

### v0.5.0 — AI-First Kiosk Rebuild
- [x] New `packages/frontend-v2/` — mobile-first PWA with kiosk UX
- [x] Camera-first prescription capture (Claude Vision API, provider-agnostic with mock fallback)
- [x] AI extraction → verification card (per-field confidence: green/yellow/red)
- [x] Voice input on every field (Web Speech API, Hindi/English)
- [x] Doctor auto-match from extraction (fuzzy) + "Add new doctor" if not found
- [x] Doctor-specialty test suggestions (gynecologist → gyn panel, etc.)
- [x] Razorpay integration (test sandbox: UPI/Card/Netbanking via checkout popup)
- [x] QR code camera scanner (html5-qrcode) + QR embedded in printed receipts
- [x] Center Head dashboard: daily operation (prev-day pending, today's cases, closed, in-progress)
- [x] Pending cases drill-down (age badge, progress x/y)
- [x] Daily closing itemized view (per-bill, per-mode breakdown)
- [x] Professional icons throughout (lucide-react, zero emojis)
- [x] Fasting status defaults to NOT_APPLICABLE
- [x] 12 doctors in system (7 added from Sort March list)
- [x] Schema: prescription_image_url, extracted_data_json, extraction_provider, fasting_status, pregnancy_status, preferred_language, preferred_delivery_channel, qr_code
- [x] GitHub Pages deployment (landing + PWA at /app/)
- [x] Render blueprint (render.yaml) for backend deploy
- [x] Old packages/frontend deleted (superseded by frontend-v2)
- [x] Landing page with "Open app" link

### Previous versions (v0.1–v0.4)
- [x] All core LIMS + billing flows
- [x] 6 roles, 20+ permissions, JWT RBAC
- [x] PDF reports, email dispatch, WhatsApp stub
- [x] Barcode labels (Code 128), bill receipts
- [x] Rate plan resolver, package billing, split payments
- [x] Bill cancellation, credit notes/refunds
- [x] Shift close, daily reconciliation
- [x] Config tables, audit trail, keyboard shortcuts
- [x] 37 unit + 48 E2E tests

## Backend runs on

- **Port 4782** (local dev)
- **Neon PostgreSQL** (cloud DB, 27+ tables)
- **Anthropic API** (Claude Vision for prescription OCR)
- **Razorpay** (test sandbox for payments)

## What Remains

### Immediate (needs backend deploy)
- Deploy backend to Render (render.yaml ready, add secrets in dashboard)
- Set VITE_API_BASE variable in GitHub repo for Pages to point at deployed backend

### Phase 2
- B2B / corporate accounts, settlement cycles
- Doctor commission payout automation
- Staff bonus rules
- Offline mode
- Hindi UI
- Native APK
- Real WhatsApp Business API + production SMTP
- S3 report storage
