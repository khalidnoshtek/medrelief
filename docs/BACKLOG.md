# Backlog

## Immediate — needs action to go live

- [ ] **Deploy backend to Render** — render.yaml ready, add secrets (DATABASE_URL, ANTHROPIC_API_KEY, RAZORPAY keys) in dashboard
- [ ] **Set VITE_API_BASE in GitHub repo** — Settings > Variables > `VITE_API_BASE` = `https://medrelief-backend.onrender.com/api/v1`
- [ ] **Re-run Pages workflow** — after adding the variable, so PWA points to deployed backend
- [ ] **Run seed on production DB** — `npx tsx prisma/seed.ts` + `npx tsx prisma/seed-new-doctors.ts`

## Phase 2 — deferred

- [ ] B2B / corporate accounts, credit limits, settlement cycles
- [ ] Doctor commission payout automation
- [ ] Staff bonus rules (per-role, metrics TBD)
- [ ] Offline mode for poor network areas
- [ ] Hindi UI (voice is already bilingual)
- [ ] Native Android APK
- [ ] Real WhatsApp Business API integration
- [ ] Real SMTP email (SendGrid/SES)
- [ ] S3 report storage with signed URLs
- [ ] Redis caching for rate plans, test catalog, RBAC
- [ ] Background job queue (report gen, dispatch)
- [ ] Shift close with physical count reconciliation
- [ ] Bill edit before payment (modify tests on DRAFT)
- [ ] Zoho export (daily close data → Zoho Books)
- [ ] CI/CD with lint + test + build gates
- [ ] Load testing (EXPLAIN ANALYZE on critical queries)

## Completed

- [x] ~~Package billing~~ (v0.2)
- [x] ~~Partial payment UI~~ (v0.2)
- [x] ~~Bill cancellation + credit note/refund~~ (v0.2)
- [x] ~~Rate plan price preview~~ (v0.2)
- [x] ~~Shift close + daily reconciliation~~ (v0.3)
- [x] ~~Bill receipt print + barcode labels~~ (v0.3)
- [x] ~~Center Head dashboard + patient history~~ (v0.4)
- [x] ~~Keyboard shortcuts + audit trail + config tables~~ (v0.4)
- [x] ~~AI prescription extraction (Claude Vision)~~ (v0.5)
- [x] ~~Voice input (Web Speech API)~~ (v0.5)
- [x] ~~Razorpay payment integration~~ (v0.5)
- [x] ~~QR camera scanner + QR on receipts~~ (v0.5)
- [x] ~~Mobile-first PWA rebuild~~ (v0.5)
- [x] ~~Professional icons (lucide-react)~~ (v0.5)
- [x] ~~Dashboard: daily ops, pending cases, itemized closing~~ (v0.5)
- [x] ~~Doctor auto-add from AI extraction~~ (v0.5)
- [x] ~~GitHub Pages + Render deployment~~ (v0.5)
- [x] ~~Landing page~~ (v0.5)
