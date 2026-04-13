# Project Status

## Current State: v0.4.0 — All 4 Priority Phases Complete

**Date**: 2026-04-09

## Completed Features

### Core Flows (P1)
- [x] Patient registration, search by mobile, deduplication
- [x] Bill creation with rate plan auto-pricing (6-level resolver)
- [x] Package billing with child test expansion
- [x] Split payments (multiple modes per bill)
- [x] Bill cancellation (before accession, with reason codes)
- [x] Credit note / refund workflow (billing_adjustments)
- [x] Payment capture (Cash, UPI stub, Card)
- [x] BillConfirmed event -> auto-accession + samples + test orders
- [x] Sample collection, receive at lab, rejection
- [x] Lab worklist with department filtering
- [x] Result entry with auto-flag derivation (NORMAL/HIGH/LOW/CRITICAL)
- [x] Pathologist sign-off
- [x] ResultSignedOff event -> report generation + delivery

### Report Delivery (P1+)
- [x] PDF report generation (pdfkit)
- [x] Email dispatch (Nodemailer + Ethereal)
- [x] WhatsApp dispatch stub
- [x] Report viewer with delivery status
- [x] PDF download, resend email/WhatsApp
- [x] Bill receipt print (thermal 80mm format)
- [x] Barcode label print for accession samples

### Finance (P2)
- [x] Shift open/close with system vs physical count variance
- [x] Daily reconciliation close with revenue summary
- [x] DailyBranchCloseCompleted event
- [x] UPI payment stub (deep link generation)

### Dashboard & History (P3)
- [x] Center Head dashboard (revenue, bills, payment mode breakdown, lab status, pending approvals)
- [x] Patient history (all visits, bills, results, reports)

### Platform (P4)
- [x] Keyboard shortcuts (F2 New Bill, F4 Focus Payment)
- [x] Audit trail (bill timeline with events, payments, adjustments)
- [x] Config tables (tenant/branch-level settings with code defaults)
- [x] JWT auth with 6 roles, 20+ permissions
- [x] Domain event system (5 event types, outbox + in-process handlers)
- [x] 37 unit tests + 48 E2E integration tests

## Architecture Summary

- **Backend**: Express + TypeScript + Prisma ORM (port 4782)
- **Frontend**: React 19 + Vite + Tailwind CSS 4 (port 5173)
- **Database**: Neon PostgreSQL (27 tables)
- **Modules**: auth, mdm, billing, lims, reporting, finance

## What Remains (Future Work)

- Real WhatsApp Business API integration
- Real SMTP email (SendGrid/SES)
- S3 report storage with signed URLs
- Redis caching for rate plans, test catalog, RBAC
- Responsive tablet UI (touch-first 13-15 inch)
- Home collection / phlebotomist mobile flow
- Background job queue (report gen, dispatch)
- Docker Compose for local dev
- Reconciliation with physical cash count verification
