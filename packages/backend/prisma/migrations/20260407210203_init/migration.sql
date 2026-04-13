-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "auth_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "auth_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "gstin" TEXT,
    "default_rate_plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_patients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "age_years" INTEGER,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_doctors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "doctor_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "mobile" TEXT,
    "linked_rate_plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_tests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "test_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "tat_hours" INTEGER NOT NULL DEFAULT 24,
    "base_mrp" DECIMAL(12,2) NOT NULL,
    "lis_mapping_code" TEXT,
    "reference_range" TEXT,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_package_tests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mdm_package_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_rate_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mdm_rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_rate_plan_tests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_package" BOOLEAN NOT NULL DEFAULT false,
    "package_id" TEXT,

    CONSTRAINT "mdm_rate_plan_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "visit_number" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL DEFAULT 'WALK_IN',
    "payer_type" TEXT NOT NULL DEFAULT 'SELF',
    "referrer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_accessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "accession_number" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "accession_status" TEXT NOT NULL DEFAULT 'PENDING',
    "accessioned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_accessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_samples" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "accession_id" TEXT NOT NULL,
    "sample_code" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "collection_time" TIMESTAMP(3),
    "received_time" TIMESTAMP(3),
    "sample_status" TEXT NOT NULL DEFAULT 'PENDING_COLLECTION',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_test_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "accession_id" TEXT NOT NULL,
    "bill_item_id" TEXT,
    "test_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sample_id" TEXT,
    "order_status" TEXT NOT NULL DEFAULT 'ORDERED',
    "assigned_to" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_test_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_results" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "test_order_id" TEXT NOT NULL,
    "raw_value" TEXT NOT NULL,
    "unit" TEXT,
    "reference_range" TEXT,
    "flag" TEXT,
    "comments" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "accession_id" TEXT NOT NULL,
    "report_number" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signed_off_by" TEXT,
    "signed_off_at" TIMESTAMP(3),
    "report_status" TEXT NOT NULL DEFAULT 'GENERATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lims_report_delivery_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lims_report_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_bills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rounding_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL,
    "bill_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
    "payer_type" TEXT NOT NULL DEFAULT 'SELF',
    "referrer_id" TEXT,
    "discount_reason_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_bill_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL DEFAULT 'TEST',
    "parent_bill_item_id" TEXT,
    "billing_visible" BOOLEAN NOT NULL DEFAULT true,
    "package_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "mrp_amount" DECIMAL(12,2) NOT NULL,
    "rate_plan_id" TEXT,
    "line_discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "instrument_details" TEXT,
    "upi_rrn" TEXT,
    "gateway_txn_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_adjustments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "adjustment_number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason_code" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "current_date" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_users_tenant_id_branch_id_idx" ON "auth_users"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_tenant_id_username_key" ON "auth_users"("tenant_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "auth_roles_tenant_id_code_key" ON "auth_roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_permissions_code_key" ON "auth_permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_role_permissions_role_id_permission_id_key" ON "auth_role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_branches_tenant_id_code_key" ON "mdm_branches"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "mdm_patients_tenant_id_mobile_idx" ON "mdm_patients"("tenant_id", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_patients_tenant_id_patient_code_key" ON "mdm_patients"("tenant_id", "patient_code");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_doctors_tenant_id_doctor_code_key" ON "mdm_doctors"("tenant_id", "doctor_code");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_tests_tenant_id_test_code_key" ON "mdm_tests"("tenant_id", "test_code");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_packages_tenant_id_package_code_key" ON "mdm_packages"("tenant_id", "package_code");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_package_tests_package_id_test_id_key" ON "mdm_package_tests"("package_id", "test_id");

-- CreateIndex
CREATE INDEX "mdm_rate_plans_tenant_id_plan_type_status_idx" ON "mdm_rate_plans"("tenant_id", "plan_type", "status");

-- CreateIndex
CREATE INDEX "mdm_rate_plan_tests_tenant_id_rate_plan_id_idx" ON "mdm_rate_plan_tests"("tenant_id", "rate_plan_id");

-- CreateIndex
CREATE INDEX "mdm_rate_plan_tests_tenant_id_test_id_idx" ON "mdm_rate_plan_tests"("tenant_id", "test_id");

-- CreateIndex
CREATE INDEX "lims_visits_tenant_id_patient_id_created_at_idx" ON "lims_visits"("tenant_id", "patient_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "lims_accessions_visit_id_key" ON "lims_accessions"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "lims_accessions_bill_id_key" ON "lims_accessions"("bill_id");

-- CreateIndex
CREATE INDEX "lims_accessions_tenant_id_branch_id_idx" ON "lims_accessions"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "lims_accessions_tenant_id_accession_number_key" ON "lims_accessions"("tenant_id", "accession_number");

-- CreateIndex
CREATE INDEX "lims_samples_tenant_id_accession_id_idx" ON "lims_samples"("tenant_id", "accession_id");

-- CreateIndex
CREATE INDEX "lims_test_orders_tenant_id_accession_id_idx" ON "lims_test_orders"("tenant_id", "accession_id");

-- CreateIndex
CREATE INDEX "lims_test_orders_tenant_id_department_order_status_idx" ON "lims_test_orders"("tenant_id", "department", "order_status");

-- CreateIndex
CREATE UNIQUE INDEX "lims_results_test_order_id_key" ON "lims_results"("test_order_id");

-- CreateIndex
CREATE INDEX "lims_results_tenant_id_test_order_id_idx" ON "lims_results"("tenant_id", "test_order_id");

-- CreateIndex
CREATE INDEX "lims_reports_tenant_id_accession_id_idx" ON "lims_reports"("tenant_id", "accession_id");

-- CreateIndex
CREATE INDEX "lims_report_delivery_logs_tenant_id_report_id_idx" ON "lims_report_delivery_logs"("tenant_id", "report_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_bills_visit_id_key" ON "billing_bills"("visit_id");

-- CreateIndex
CREATE INDEX "billing_bills_tenant_id_branch_id_bill_date_idx" ON "billing_bills"("tenant_id", "branch_id", "bill_date" DESC);

-- CreateIndex
CREATE INDEX "billing_bills_tenant_id_bill_status_payment_status_idx" ON "billing_bills"("tenant_id", "bill_status", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_bills_tenant_id_bill_number_key" ON "billing_bills"("tenant_id", "bill_number");

-- CreateIndex
CREATE INDEX "billing_bill_items_tenant_id_bill_id_idx" ON "billing_bill_items"("tenant_id", "bill_id");

-- CreateIndex
CREATE INDEX "billing_payments_tenant_id_bill_id_idx" ON "billing_payments"("tenant_id", "bill_id");

-- CreateIndex
CREATE INDEX "billing_payments_tenant_id_branch_id_received_at_idx" ON "billing_payments"("tenant_id", "branch_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "billing_adjustments_tenant_id_bill_id_idx" ON "billing_adjustments"("tenant_id", "bill_id");

-- CreateIndex
CREATE INDEX "billing_adjustments_tenant_id_type_status_idx" ON "billing_adjustments"("tenant_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_adjustments_tenant_id_adjustment_number_key" ON "billing_adjustments"("tenant_id", "adjustment_number");

-- CreateIndex
CREATE INDEX "domain_events_tenant_id_event_type_status_idx" ON "domain_events"("tenant_id", "event_type", "status");

-- CreateIndex
CREATE INDEX "domain_events_tenant_id_aggregate_type_aggregate_id_idx" ON "domain_events"("tenant_id", "aggregate_type", "aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "number_sequences_tenant_id_branch_id_prefix_current_date_key" ON "number_sequences"("tenant_id", "branch_id", "prefix", "current_date");

-- AddForeignKey
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_role_permissions" ADD CONSTRAINT "auth_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_role_permissions" ADD CONSTRAINT "auth_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_doctors" ADD CONSTRAINT "mdm_doctors_linked_rate_plan_id_fkey" FOREIGN KEY ("linked_rate_plan_id") REFERENCES "mdm_rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_package_tests" ADD CONSTRAINT "mdm_package_tests_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "mdm_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_package_tests" ADD CONSTRAINT "mdm_package_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mdm_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_rate_plan_tests" ADD CONSTRAINT "mdm_rate_plan_tests_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "mdm_rate_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_rate_plan_tests" ADD CONSTRAINT "mdm_rate_plan_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mdm_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_rate_plan_tests" ADD CONSTRAINT "mdm_rate_plan_tests_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "mdm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_visits" ADD CONSTRAINT "lims_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "mdm_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_visits" ADD CONSTRAINT "lims_visits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_visits" ADD CONSTRAINT "lims_visits_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "mdm_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_accessions" ADD CONSTRAINT "lims_accessions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "lims_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_accessions" ADD CONSTRAINT "lims_accessions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "billing_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_accessions" ADD CONSTRAINT "lims_accessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_samples" ADD CONSTRAINT "lims_samples_accession_id_fkey" FOREIGN KEY ("accession_id") REFERENCES "lims_accessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_test_orders" ADD CONSTRAINT "lims_test_orders_accession_id_fkey" FOREIGN KEY ("accession_id") REFERENCES "lims_accessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_test_orders" ADD CONSTRAINT "lims_test_orders_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mdm_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_test_orders" ADD CONSTRAINT "lims_test_orders_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "lims_samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_results" ADD CONSTRAINT "lims_results_test_order_id_fkey" FOREIGN KEY ("test_order_id") REFERENCES "lims_test_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_reports" ADD CONSTRAINT "lims_reports_accession_id_fkey" FOREIGN KEY ("accession_id") REFERENCES "lims_accessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lims_report_delivery_logs" ADD CONSTRAINT "lims_report_delivery_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "lims_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bills" ADD CONSTRAINT "billing_bills_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "lims_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bills" ADD CONSTRAINT "billing_bills_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bills" ADD CONSTRAINT "billing_bills_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "mdm_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bill_items" ADD CONSTRAINT "billing_bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "billing_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bill_items" ADD CONSTRAINT "billing_bill_items_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mdm_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_bill_items" ADD CONSTRAINT "billing_bill_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "mdm_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "billing_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_adjustments" ADD CONSTRAINT "billing_adjustments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "billing_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
