# Backlog

## Completed

- [x] ~~Package billing~~ (v0.2)
- [x] ~~Partial payment UI~~ (v0.2)
- [x] ~~Bill cancellation~~ (v0.2)
- [x] ~~Credit note / refund~~ (v0.2)
- [x] ~~Rate plan price preview~~ (v0.2)
- [x] ~~Shift close~~ (v0.3)
- [x] ~~Daily reconciliation~~ (v0.3)
- [x] ~~UPI payment stub~~ (v0.3)
- [x] ~~Bill receipt print~~ (v0.3)
- [x] ~~Barcode label print~~ (v0.3)
- [x] ~~Center Head dashboard~~ (v0.4)
- [x] ~~Patient history page~~ (v0.4)
- [x] ~~Keyboard shortcuts~~ (v0.4)
- [x] ~~Audit trail UI~~ (v0.4)
- [x] ~~Config tables~~ (v0.4)

## Remaining — Production Readiness

- [ ] **Real WhatsApp integration** — WhatsApp Business API (Twilio/Meta Cloud API)
- [ ] **Real email SMTP** — production SMTP config (SendGrid/SES)
- [ ] **S3 report storage** — production storage with signed URLs
- [ ] **Redis caching** — rate plan, test catalog, RBAC matrix
- [ ] **Responsive tablet UI** — optimize for 13-15 inch touch devices
- [ ] **Home collection flow** — phlebotomist mobile collection list
- [ ] **Background job queue** — move report generation/dispatch to async workers
- [ ] **Docker Compose** — full local dev setup (app + postgres + redis)
- [ ] **Report PDF polish** — add lab logo, proper letterhead, configurable template
- [ ] **Shift close with physical count reconciliation** — variance verification
- [ ] **Bill edit before payment** — modify tests on DRAFT/PENDING_PAYMENT bills
- [ ] **Zoho export** — daily close data export to Zoho Books
- [ ] **CI/CD pipeline** — lint, test, build, deploy stages
- [ ] **Load testing** — EXPLAIN ANALYZE on critical queries
