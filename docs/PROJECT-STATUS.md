# Project Status

## Current State: v0.6.0 — Live on GitHub Pages + Render | PRD v3.0 Ready

**Date**: 2026-04-16

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

### v0.6.1 — Documentation Sprint (2026-04-16)
- [x] Prototype Flow Document: 16 mobile screenshots (390x844), end-to-end patient journey (Medrelief-Prototype-Flow.docx)
- [x] TimeFlow Auth Flow Document: 13 screenshots, authorization model analysis (TimeFlow-Auth-Flow.docx)
- [x] Prototype Feedback + Additions: stakeholder review capture (PROTOTYPE-FEEDBACK-ADDITIONS.md, 8 sections)
- [x] Combined Phase 1 Requirements doc: Medrelief-Phase1-Requirements.docx (standalone, 16 screenshots + all additions)
- [x] PRD v3.0: Original PRD sections 1-14 intact + sections 15-20 added (production additions, auth model, new features, 29 screenshots embedded)
- [x] Product vision codified: AI-first LIMS, kiosk-style, Siri/Alexa voice assistant for all roles, prototype = product spec
- [x] Authorization model designed: 4-tier RBAC (Super Admin > Center Head > Dept Lead > Staff), role switching, multi-center org hierarchy, approval chains, notification routing
- [x] DB schema proposed: 8 new tables (org_tenants, org_regions, org_centers, auth_roles, auth_user_assignments, approval_chains, approval_requests, approval_decisions, notifications)

## Production Build Plan

The prototype IS the product. Production will be built from scratch in a new repo with the same AI-first flow (scan prescription > AI extract > confirm > pay > auto-accession > lab > sign-off > auto-report > WhatsApp delivery). Key additions over prototype:

- Multi-center org hierarchy (Tenant > Region > Center > Sub-center)
- 4-tier RBAC with approval chains (discount overrides, write-offs, amendments)
- Siri/Alexa-style AI voice assistant for ALL roles (not just receptionist)
- Transaction-level tracking with main status + sub-status
- WhatsApp Business API for patient report delivery
- In-app report viewer (replace PDF-first download)
- Role-based notifications (multi-channel: in-app, WhatsApp, push)
- Settlement rule: bill not settled until report delivered

## What Remains

### Phase 2
- B2B / corporate accounts, settlement cycles
- Doctor commission payout
- Staff bonus rules
- Offline mode, Hindi UI, native APK
- Real WhatsApp/email, S3 storage
- Prisma 7 upgrade
