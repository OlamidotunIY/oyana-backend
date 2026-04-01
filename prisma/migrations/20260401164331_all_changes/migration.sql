-- CreateEnum
CREATE TYPE "DriverOnboardingStatus" AS ENUM ('not_started', 'draft', 'in_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DriverComplianceDocumentType" AS ENUM ('selfie', 'driver_license', 'identity_document', 'nin', 'insurance', 'vehicle_registration', 'proof_of_address');

-- CreateEnum
CREATE TYPE "DriverComplianceDocumentStatus" AS ENUM ('uploaded', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DriverPresenceSource" AS ENUM ('gps');

-- DropIndex
DROP INDEX "vehicles_provider_id_category_status_idx";

-- DropEnum
DROP TYPE "UserType";

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "provider_id" UUID,
    "onboarding_status" "DriverOnboardingStatus" NOT NULL DEFAULT 'not_started',
    "driver_type" "VehicleCategory",
    "legal_first_name" TEXT,
    "legal_last_name" TEXT,
    "date_of_birth" DATE,
    "selfie_storage_bucket" TEXT,
    "selfie_storage_path" TEXT,
    "license_number" TEXT,
    "license_expiry_at" DATE,
    "identity_type" TEXT,
    "identity_number" TEXT,
    "insurance_policy_number" TEXT,
    "rejection_reason" TEXT,
    "can_dispatch" BOOLEAN NOT NULL DEFAULT false,
    "can_freight" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vehicles" (
    "id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "plate_number" TEXT,
    "vin" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "capacity_kg" INTEGER,
    "capacity_volume_cm3" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_compliance_documents" (
    "id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "type" "DriverComplianceDocumentType" NOT NULL,
    "status" "DriverComplianceDocumentStatus" NOT NULL DEFAULT 'uploaded',
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "notes" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_onboarding_submissions" (
    "id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "status" "DriverOnboardingStatus" NOT NULL,
    "rejection_reason" TEXT,
    "reviewer_id" UUID,
    "snapshot" JSONB,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_onboarding_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_presence" (
    "id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "source" "DriverPresenceSource" NOT NULL DEFAULT 'gps',
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy_meters" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed_kph" DOUBLE PRECISION,
    "recorded_at" TIMESTAMPTZ(6),
    "last_heartbeat_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_profile_id_key" ON "driver_profiles"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_provider_id_key" ON "driver_profiles"("provider_id");

-- CreateIndex
CREATE INDEX "driver_profiles_onboarding_status_driver_type_idx" ON "driver_profiles"("onboarding_status", "driver_type");

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicles_driver_profile_id_key" ON "driver_vehicles"("driver_profile_id");

-- CreateIndex
CREATE INDEX "driver_compliance_documents_driver_profile_id_type_created__idx" ON "driver_compliance_documents"("driver_profile_id", "type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_compliance_documents_driver_profile_id_type_storage__key" ON "driver_compliance_documents"("driver_profile_id", "type", "storage_bucket", "storage_path");

-- CreateIndex
CREATE INDEX "driver_onboarding_submissions_driver_profile_id_submitted_a_idx" ON "driver_onboarding_submissions"("driver_profile_id", "submitted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_presence_driver_profile_id_key" ON "driver_presence"("driver_profile_id");

-- CreateIndex
CREATE INDEX "driver_presence_is_online_last_heartbeat_at_idx" ON "driver_presence"("is_online", "last_heartbeat_at" DESC);

-- CreateIndex
CREATE INDEX "profiles_account_role_active_app_mode_idx" ON "profiles"("account_role", "active_app_mode");

-- CreateIndex
CREATE INDEX "vehicles_category_status_idx" ON "vehicles"("category", "status");

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_compliance_documents" ADD CONSTRAINT "driver_compliance_documents_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_onboarding_submissions" ADD CONSTRAINT "driver_onboarding_submissions_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_onboarding_submissions" ADD CONSTRAINT "driver_onboarding_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_presence" ADD CONSTRAINT "driver_presence_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
