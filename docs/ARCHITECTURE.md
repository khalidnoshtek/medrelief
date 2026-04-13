# Architecture - Phase 1 Prototype

## Overview

Modular monolith with 6 logical modules sharing a single PostgreSQL database. Module boundaries enforced at code level via service interfaces.

## Modules

```
auth        JWT login, RBAC middleware, role-based permission checks
mdm         Patient, doctor, test catalog, rate plans, branches
billing     Bill creation (with rate plan pricing), payments, adjustments
lims        Visits, accessions, samples, test orders, results
reporting   Report generation stubs, delivery log tracking
finance     (Placeholder for Phase 1 - shift close, daily reconciliation)
```

## Data Flow

```
Registration -> Visit -> Bill (rate plan pricing) -> Payment
    |                                                    |
    |              BillConfirmed event ------------------|
    |                       |
    v                       v
Patient             Accession + Samples + Test Orders
                            |
                    Sample Collection -> Lab Processing
                            |
                    Result Entry -> Pathologist Sign-Off
                            |
                    ResultSignedOff event
                            |
                    Report Stub + Delivery Logs
```

## Domain Events (Event-Lite)

| Event | Trigger | Handler |
|-------|---------|---------|
| BillConfirmed | Payment completes bill | Creates accession, samples, test orders |
| PaymentReceived | Payment recorded | Logged to outbox |
| SampleAccessioned | Accession created | Logged to outbox |
| ResultSignedOff | Pathologist approves | Checks all orders; generates report if complete |
| DailyBranchCloseCompleted | (Not implemented) | Future: finance summaries |

Events persist to `domain_events` outbox table, then processed in-process synchronously.

## Database

Single PostgreSQL instance (Neon free tier). Tables use module-prefixed names: `mdm_patients`, `billing_bills`, `lims_accessions`, etc.

All transactional tables include: `id` (UUID), `tenant_id`, `branch_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `version` (optimistic locking).

### Key Tables (25 total)

- **Auth**: auth_users, auth_roles, auth_permissions, auth_role_permissions
- **MDM**: mdm_branches, mdm_patients, mdm_doctors, mdm_tests, mdm_packages, mdm_package_tests, mdm_rate_plans, mdm_rate_plan_tests
- **Billing**: billing_bills, billing_bill_items, billing_payments, billing_adjustments
- **LIMS**: lims_visits, lims_accessions, lims_samples, lims_test_orders, lims_results, lims_reports, lims_report_delivery_logs
- **Shared**: domain_events, number_sequences

## Rate Plan Resolution

Deterministic 6-level priority chain per PRD:
1. Explicit bill-level override
2. Referrer-linked plan (doctor)
3. Organization/corporate plan
4. Payer-type mapped plan
5. Branch default plan
6. Tenant MRP plan

Per-test fallback down the chain. Unresolved tests reject bill creation.

## Auth

JWT tokens with embedded permissions. 6 roles mapped to ~20 permission codes. Auth middleware validates token and injects request context. `requirePermission()` factory for route-level RBAC.

## Prototype Shortcuts

1. Single Prisma schema (not multi-schema) with module-prefixed tables
2. No Redis caching
3. No PDF generation (report stubs only)
4. No WhatsApp/email dispatch (delivery logs with PENDING status)
5. No background job queues (events processed synchronously)
6. Tax hardcoded to 0
7. No offline support
8. No concurrent edit locks (version column only)
