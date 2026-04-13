-- AlterTable
ALTER TABLE "billing_bills" ADD COLUMN     "qr_code" TEXT;

-- AlterTable
ALTER TABLE "lims_visits" ADD COLUMN     "extracted_data_json" JSONB,
ADD COLUMN     "extraction_provider" TEXT,
ADD COLUMN     "fasting_status" TEXT,
ADD COLUMN     "pregnancy_status" TEXT,
ADD COLUMN     "prescription_image_url" TEXT;

-- AlterTable
ALTER TABLE "mdm_patients" ADD COLUMN     "preferred_delivery_channel" TEXT,
ADD COLUMN     "preferred_language" TEXT;
