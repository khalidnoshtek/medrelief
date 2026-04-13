-- CreateTable
CREATE TABLE "finance_shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "shift_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "system_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "system_upi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "system_card" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "system_other" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_cash" DECIMAL(12,2),
    "actual_upi" DECIMAL(12,2),
    "actual_card" DECIMAL(12,2),
    "actual_other" DECIMAL(12,2),
    "variance_cash" DECIMAL(12,2),
    "variance_upi" DECIMAL(12,2),
    "variance_card" DECIMAL(12,2),
    "variance_other" DECIMAL(12,2),
    "variance_reason" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "finance_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_daily_close" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "close_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "total_bills" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_upi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_card" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_other" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "finance_daily_close_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_shifts_tenant_id_branch_id_status_idx" ON "finance_shifts"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "finance_shifts_tenant_id_shift_number_key" ON "finance_shifts"("tenant_id", "shift_number");

-- CreateIndex
CREATE INDEX "finance_daily_close_tenant_id_branch_id_idx" ON "finance_daily_close"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_daily_close_tenant_id_branch_id_close_date_key" ON "finance_daily_close"("tenant_id", "branch_id", "close_date");

-- AddForeignKey
ALTER TABLE "finance_shifts" ADD CONSTRAINT "finance_shifts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_daily_close" ADD CONSTRAINT "finance_daily_close_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "mdm_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
