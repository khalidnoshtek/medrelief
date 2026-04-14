# Project Status

## Current State: v0.6.0 — Live on GitHub Pages + Render

**Date**: 2026-04-14

## Live URLs

| URL | What |
|---|---|
| https://khalidnoshtek.github.io/medrelief/ | Landing page |
| https://khalidnoshtek.github.io/medrelief/app/ | Frontend PWA (live, connected to Render backend) |
| https://medrelief-backend.onrender.com | Backend API (Render free tier) |
| https://github.com/khalidnoshtek/medrelief | Source repo |

## What's Done

### v0.6.0 — Deployment + Dashboard Overhaul + AI Assistant
- [x] Deployed backend to Render (free tier, auto-deploys from main)
- [x] Frontend PWA on GitHub Pages at /app/ with SPA routing fix
- [x] CORS configured for cross-origin (Pages → Render)
- [x] Helmet CSP disabled on API server
- [x] Center head dashboard IS the home (no separate billing screen)
- [x] Daily close history items clickable → itemized view for any date
- [x] AI business assistant on dashboard (real Claude intelligence)
- [x] Assistant handles: revenue, bills, tests, doctors, pending, lab status, summaries, bill lookup
- [x] Logo redirects to /dashboard for center head, /home for others
- [x] Doctor bills page (search doctor → see all referred bills)
- [x] Bill detail page has "Collect Payment" retry for failed/partial payments
- [x] Razorpay test sandbox working (keys in render.yaml)
- [x] Receipt QR overlap fixed, page size increased
- [x] QR scan → bill auto-refreshes (no manual reload needed)
- [x] Strict doctor name matching (no wrong "Patel" matches)
- [x] Mic button overflow on mobile fixed
- [x] Professional icons throughout (lucide-react)
- [x] Hard refresh SPA routing fixed (base path preserved)

### v0.5.0 — AI-First Kiosk Rebuild
- [x] New frontend-v2 (mobile-first PWA, kiosk UX)
- [x] Camera prescription capture (Claude Vision)
- [x] Voice input (Web Speech API, Hindi/English)
- [x] QR codes (gen + scan + on receipts + barcode labels)
- [x] Razorpay payment integration
- [x] 12 doctors, 20 tests, seed data

### v0.1–v0.4 — Foundation
- [x] All core LIMS + billing flows
- [x] 6 roles, 20+ permissions, JWT RBAC
- [x] PDF reports, email, WhatsApp stub
- [x] Rate plan resolver, package billing, split payments
- [x] 37 unit + 48 E2E tests

## Architecture

- **Backend**: Express + TypeScript + Prisma + tsx runtime (port 4782)
- **Frontend-v2**: React 19 + Vite + Tailwind 4 PWA (port 5174 local, Pages prod)
- **Database**: Neon PostgreSQL (27+ tables)
- **AI**: Claude Vision (prescription OCR) + Claude Haiku (business assistant)
- **Payments**: Razorpay test sandbox
- **Deployment**: GitHub Pages (frontend) + Render (backend)

## What Remains

### Phase 2
- B2B / corporate accounts, settlement cycles
- Doctor commission payout
- Staff bonus rules
- Offline mode, Hindi UI, native APK
- Real WhatsApp/email, S3 storage
- Prisma 7 upgrade
