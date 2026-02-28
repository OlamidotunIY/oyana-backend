ALTER TABLE "providers"
  ADD COLUMN IF NOT EXISTS "is_available" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "availability_updated_at" TIMESTAMPTZ(6);
