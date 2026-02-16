/*
  Warnings:

  - You are about to drop the column `business_address` on the `providers` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `providers` table. All the data in the column will be lost.
  - You are about to drop the column `legal_name` on the `providers` table. All the data in the column will be lost.
  - You are about to drop the column `owner_provider_id` on the `wallet_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `owner_type` on the `wallet_accounts` table. All the data in the column will be lost.
  - Added the required column `kyc_case_id` to the `nin_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "provider_kyc_cases" DROP CONSTRAINT "provider_kyc_cases_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "wallet_accounts" DROP CONSTRAINT "wallet_accounts_owner_provider_id_fkey";

-- DropIndex
DROP INDEX "wallet_accounts_owner_type_owner_profile_id_idx";

-- DropIndex
DROP INDEX "wallet_accounts_owner_type_owner_provider_id_idx";

-- AlterTable
ALTER TABLE "nin_verifications" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "kyc_case_id" UUID NOT NULL,
ADD COLUMN     "last_name" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "vendor" DROP NOT NULL;

-- AlterTable
ALTER TABLE "provider_kyc_cases" ADD COLUMN     "documents_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "face_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kyc_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_verification_attempt" TIMESTAMPTZ(6),
ADD COLUMN     "nin_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vehicle_verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "providers" DROP COLUMN "business_address",
DROP COLUMN "display_name",
DROP COLUMN "legal_name";

-- AlterTable
ALTER TABLE "wallet_accounts" DROP COLUMN "owner_provider_id",
DROP COLUMN "owner_type";

-- CreateTable
CREATE TABLE "phone_verifications" (
    "id" UUID NOT NULL,
    "kyc_case_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "phone_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verification_code" TEXT,
    "code_expires_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_verifications" (
    "id" UUID NOT NULL,
    "kyc_case_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vendor" TEXT,
    "vendor_reference" TEXT,
    "face_image_url" TEXT,
    "liveness_score" DECIMAL(5,2),
    "match_score" DECIMAL(5,2),
    "verified_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "face_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_verifications" (
    "id" UUID NOT NULL,
    "kyc_case_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "plate_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vendor" TEXT,
    "vendor_reference" TEXT,
    "registration_verified" BOOLEAN NOT NULL DEFAULT false,
    "insurance_verified" BOOLEAN NOT NULL DEFAULT false,
    "roadworthiness_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_verifications_kyc_case_id_idx" ON "phone_verifications"("kyc_case_id");

-- CreateIndex
CREATE INDEX "phone_verifications_provider_id_status_idx" ON "phone_verifications"("provider_id", "status");

-- CreateIndex
CREATE INDEX "phone_verifications_phone_number_idx" ON "phone_verifications"("phone_number");

-- CreateIndex
CREATE INDEX "face_verifications_kyc_case_id_idx" ON "face_verifications"("kyc_case_id");

-- CreateIndex
CREATE INDEX "face_verifications_provider_id_status_idx" ON "face_verifications"("provider_id", "status");

-- CreateIndex
CREATE INDEX "vehicle_verifications_kyc_case_id_idx" ON "vehicle_verifications"("kyc_case_id");

-- CreateIndex
CREATE INDEX "vehicle_verifications_provider_id_status_idx" ON "vehicle_verifications"("provider_id", "status");

-- CreateIndex
CREATE INDEX "vehicle_verifications_plate_number_idx" ON "vehicle_verifications"("plate_number");

-- CreateIndex
CREATE INDEX "nin_verifications_kyc_case_id_idx" ON "nin_verifications"("kyc_case_id");

-- CreateIndex
CREATE INDEX "provider_kyc_cases_kyc_level_idx" ON "provider_kyc_cases"("kyc_level");

-- CreateIndex
CREATE INDEX "wallet_accounts_owner_profile_id_idx" ON "wallet_accounts"("owner_profile_id");

-- AddForeignKey
ALTER TABLE "nin_verifications" ADD CONSTRAINT "nin_verifications_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "provider_kyc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "provider_kyc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_verifications" ADD CONSTRAINT "face_verifications_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "provider_kyc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_verifications" ADD CONSTRAINT "face_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_verifications" ADD CONSTRAINT "vehicle_verifications_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "provider_kyc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_verifications" ADD CONSTRAINT "vehicle_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_verifications" ADD CONSTRAINT "vehicle_verifications_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
