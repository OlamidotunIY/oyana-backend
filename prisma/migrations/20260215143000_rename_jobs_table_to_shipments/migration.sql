-- Align legacy jobs table with current Shipment Prisma model.
-- This migration is intentionally scoped to the Shipment model used by ShipmentsService.

-- Rename main table from legacy name.
ALTER TABLE "jobs" RENAME TO "shipments";

-- Rename columns to match Prisma field mappings in prisma/schemas/jobs.prisma.
ALTER TABLE "shipments" RENAME COLUMN "public_code" TO "tracking_code";
ALTER TABLE "shipments" RENAME COLUMN "pickup_location_id" TO "pickup_address_id";
ALTER TABLE "shipments" RENAME COLUMN "dropoff_location_id" TO "dropoff_address_id";

-- Add columns introduced after the legacy jobs schema.
ALTER TABLE "shipments" ADD COLUMN "schedule_type" TEXT;
UPDATE "shipments"
SET "schedule_type" = CASE
  WHEN "scheduled_at" IS NULL THEN 'instant'
  ELSE 'scheduled'
END
WHERE "schedule_type" IS NULL;
ALTER TABLE "shipments" ALTER COLUMN "schedule_type" SET NOT NULL;
ALTER TABLE "shipments" ALTER COLUMN "schedule_type" SET DEFAULT 'instant';

ALTER TABLE "shipments" ADD COLUMN "requires_escrow" BOOLEAN NOT NULL DEFAULT false;
