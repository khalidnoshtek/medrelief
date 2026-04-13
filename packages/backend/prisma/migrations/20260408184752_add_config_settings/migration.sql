-- CreateTable
CREATE TABLE "config_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "config_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "config_settings_tenant_id_key_idx" ON "config_settings"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "config_settings_tenant_id_branch_id_key_key" ON "config_settings"("tenant_id", "branch_id", "key");
