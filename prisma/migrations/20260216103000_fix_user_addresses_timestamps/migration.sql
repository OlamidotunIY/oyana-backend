-- Align user_addresses with current Prisma UserAddress model.
-- 20260213121204_fix_user_address_job_relations created this table without timestamps.

ALTER TABLE "user_addresses"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "user_addresses_profileId_created_at_idx"
ON "user_addresses"("profileId", "created_at" DESC);
