# LIMS Flows - Phase 1

## Flow 1: Registration -> Billing -> Payment -> Accession

1. Receptionist searches patient by mobile number
2. Selects existing or creates new patient
3. Sets visit type, payer type, referring doctor
4. Adds tests via search (quick-pick)
5. Rate plan resolver auto-prices each test based on priority chain
6. Bill created in PENDING_PAYMENT status
7. Receptionist selects payment mode (Cash/UPI/Card) and confirms
8. Payment recorded, bill transitions to PAID
9. BillConfirmed event emitted
10. Accession auto-created with samples grouped by sample_type and test orders

## Flow 2: Sample Collection -> Lab Processing -> Result Entry -> Sign-Off

1. Lab technician views worklist (filtered by department, auto-refreshes)
2. Collects samples (PENDING_COLLECTION -> COLLECTED)
3. Receives samples at lab (COLLECTED -> RECEIVED_AT_LAB)
4. Starts processing test orders (ORDERED -> IN_PROCESS)
5. Enters result values (auto-derives flag: NORMAL/HIGH/LOW/CRITICAL)
6. Test order transitions to COMPLETED
7. Pathologist reviews results on sign-off screen
8. Signs off each test (COMPLETED -> APPROVED)
9. ResultSignedOff event emitted per test

## Flow 3: Report Generation -> Delivery

1. On ResultSignedOff, system checks if ALL test orders in accession are APPROVED
2. If yes, creates report stub (report_number, status: GENERATED)
3. Creates delivery log entries for WhatsApp (patient mobile) and email (patient email)
4. Delivery logs created with status PENDING (actual dispatch not implemented)
5. Manual resend available via API

## Status Transitions

### Bill
DRAFT -> PENDING_PAYMENT -> PARTIALLY_PAID -> PAID -> (CANCELLED | REFUNDED)

### Sample
PENDING_COLLECTION -> COLLECTED -> RECEIVED_AT_LAB -> IN_PROCESS -> COMPLETED -> (REJECTED)

### Test Order
ORDERED -> IN_PROCESS -> COMPLETED -> APPROVED

### Report
GENERATED -> SIGNED_OFF -> AMENDED
