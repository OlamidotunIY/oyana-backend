-- Prembly-managed KYC cutover: drop legacy KYC case/doc tables, add profile/check/media tables.

DROP TABLE IF EXISTS "vehicle_verifications" CASCADE;
DROP TABLE IF EXISTS "face_verifications" CASCADE;
DROP TABLE IF EXISTS "phone_verifications" CASCADE;
DROP TABLE IF EXISTS "nin_verifications" CASCADE;
DROP TABLE IF EXISTS "kyc_documents" CASCADE;
DROP TABLE IF EXISTS "provider_kyc_cases" CASCADE;

ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "vin" TEXT,
  ADD COLUMN IF NOT EXISTS "plate_verification_status" TEXT,
  ADD COLUMN IF NOT EXISTS "vin_verification_status" TEXT,
  ADD COLUMN IF NOT EXISTS "last_verification_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "verification_failure_reason" TEXT;

DROP INDEX IF EXISTS "unique_vehicle_vin";
CREATE UNIQUE INDEX IF NOT EXISTS "unique_vehicle_vin" ON "vehicles"("vin");

CREATE TABLE IF NOT EXISTS "provider_kyc_profiles" (
  "id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "overall_status" TEXT NOT NULL DEFAULT 'pending',
  "kyc_level" INTEGER NOT NULL DEFAULT 0,
  "nin_status" TEXT NOT NULL DEFAULT 'unverified',
  "phone_status" TEXT NOT NULL DEFAULT 'unverified',
  "face_status" TEXT NOT NULL DEFAULT 'unverified',
  "vehicle_plate_status" TEXT NOT NULL DEFAULT 'unverified',
  "vehicle_vin_status" TEXT NOT NULL DEFAULT 'unverified',
  "nin_verified_at" TIMESTAMPTZ(6),
  "phone_verified_at" TIMESTAMPTZ(6),
  "face_verified_at" TIMESTAMPTZ(6),
  "vehicle_plate_verified_at" TIMESTAMPTZ(6),
  "vehicle_vin_verified_at" TIMESTAMPTZ(6),
  "face_confidence" DECIMAL(7,4),
  "masked_nin" TEXT,
  "masked_phone" TEXT,
  "failure_summary" TEXT,
  "last_vendor_sync_at" TIMESTAMPTZ(6),
  "last_check_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "provider_kyc_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_kyc_profiles_provider_id_key" ON "provider_kyc_profiles"("provider_id");
CREATE INDEX IF NOT EXISTS "provider_kyc_profiles_overall_status_idx" ON "provider_kyc_profiles"("overall_status");
CREATE INDEX IF NOT EXISTS "provider_kyc_profiles_kyc_level_idx" ON "provider_kyc_profiles"("kyc_level");

CREATE TABLE IF NOT EXISTS "provider_kyc_checks" (
  "id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "profile_id" UUID,
  "vehicle_id" UUID,
  "check_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "vendor" TEXT NOT NULL DEFAULT 'prembly',
  "vendor_reference" TEXT,
  "response_code" TEXT,
  "confidence" DECIMAL(7,4),
  "message" TEXT,
  "masked_identifier" TEXT,
  "normalized_data" JSONB,
  "raw_request" JSONB,
  "raw_response" JSONB,
  "expires_at" TIMESTAMPTZ(6),
  "verified_at" TIMESTAMPTZ(6),
  "failed_at" TIMESTAMPTZ(6),
  "initiated_by_profile_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "provider_kyc_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_provider_kyc_check_vendor_reference" ON "provider_kyc_checks"("vendor_reference");
CREATE INDEX IF NOT EXISTS "provider_kyc_checks_provider_type_created_idx" ON "provider_kyc_checks"("provider_id", "check_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "provider_kyc_checks_status_idx" ON "provider_kyc_checks"("status");
CREATE INDEX IF NOT EXISTS "provider_kyc_checks_profile_id_idx" ON "provider_kyc_checks"("profile_id");
CREATE INDEX IF NOT EXISTS "provider_kyc_checks_vehicle_id_idx" ON "provider_kyc_checks"("vehicle_id");

CREATE TABLE IF NOT EXISTS "provider_kyc_media" (
  "id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "check_id" UUID,
  "storage_bucket" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" BIGINT,
  "upload_state" TEXT NOT NULL DEFAULT 'uploaded',
  "uploaded_by_profile_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "provider_kyc_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_kyc_media_storage_bucket_storage_path_key" ON "provider_kyc_media"("storage_bucket", "storage_path");
CREATE INDEX IF NOT EXISTS "provider_kyc_media_provider_created_idx" ON "provider_kyc_media"("provider_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "provider_kyc_media_check_id_idx" ON "provider_kyc_media"("check_id");

ALTER TABLE "provider_kyc_profiles"
  ADD CONSTRAINT "provider_kyc_profiles_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_checks"
  ADD CONSTRAINT "provider_kyc_checks_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_checks"
  ADD CONSTRAINT "provider_kyc_checks_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "provider_kyc_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_checks"
  ADD CONSTRAINT "provider_kyc_checks_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_checks"
  ADD CONSTRAINT "provider_kyc_checks_initiated_by_profile_id_fkey"
  FOREIGN KEY ("initiated_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_media"
  ADD CONSTRAINT "provider_kyc_media_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_media"
  ADD CONSTRAINT "provider_kyc_media_check_id_fkey"
  FOREIGN KEY ("check_id") REFERENCES "provider_kyc_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_kyc_media"
  ADD CONSTRAINT "provider_kyc_media_uploaded_by_profile_id_fkey"
  FOREIGN KEY ("uploaded_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
