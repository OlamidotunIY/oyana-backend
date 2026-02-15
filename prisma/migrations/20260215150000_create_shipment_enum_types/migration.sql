-- Create missing enum types expected by the current Prisma schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentMode') THEN
    CREATE TYPE "ShipmentMode" AS ENUM ('dispatch', 'marketplace');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VehicleCategory') THEN
    CREATE TYPE "VehicleCategory" AS ENUM ('bike', 'van', 'truck');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentScheduleType') THEN
    CREATE TYPE "ShipmentScheduleType" AS ENUM ('instant', 'scheduled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentStatus') THEN
    CREATE TYPE "ShipmentStatus" AS ENUM (
      'draft',
      'created',
      'broadcasting',
      'assigned',
      'en_route_pickup',
      'picked_up',
      'en_route_dropoff',
      'delivered',
      'completed',
      'cancelled',
      'expired'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentEventType') THEN
    CREATE TYPE "ShipmentEventType" AS ENUM (
      'created',
      'broadcasted',
      'bid_placed',
      'assigned',
      'accepted',
      'cancelled',
      'picked_up',
      'delivered',
      'completed'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentActorRole') THEN
    CREATE TYPE "ShipmentActorRole" AS ENUM ('customer', 'provider', 'admin', 'system');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchBatchStatus') THEN
    CREATE TYPE "DispatchBatchStatus" AS ENUM ('open', 'closed', 'assigned', 'expired', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchOfferStatus') THEN
    CREATE TYPE "DispatchOfferStatus" AS ENUM ('sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentAssignmentStatus') THEN
    CREATE TYPE "ShipmentAssignmentStatus" AS ENUM ('active', 'completed', 'cancelled');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BidStatus') THEN
    CREATE TYPE "BidStatus" AS ENUM ('active', 'withdrawn', 'rejected', 'accepted');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentMilestoneType') THEN
    CREATE TYPE "ShipmentMilestoneType" AS ENUM (
      'accepted',
      'arrived_pickup',
      'picked_up',
      'arrived_dropoff',
      'delivered',
      'completed'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentMilestoneStatus') THEN
    CREATE TYPE "ShipmentMilestoneStatus" AS ENUM ('pending', 'reached', 'verified');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpPurpose') THEN
    CREATE TYPE "OtpPurpose" AS ENUM ('delivery_completion', 'handoff_confirmation', 'dispute_resolution');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PodUploadType') THEN
    CREATE TYPE "PodUploadType" AS ENUM ('photo', 'signature', 'document');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WaybillStatus') THEN
    CREATE TYPE "WaybillStatus" AS ENUM ('uploaded', 'approved', 'rejected');
  END IF;
END
$$;

-- Convert legacy text columns to enum-backed columns expected by Prisma.
ALTER TABLE "shipments"
  ALTER COLUMN "mode" TYPE "ShipmentMode" USING LOWER("mode")::"ShipmentMode",
  ALTER COLUMN "vehicle_category" TYPE "VehicleCategory" USING LOWER("vehicle_category")::"VehicleCategory",
  ALTER COLUMN "status" TYPE "ShipmentStatus" USING LOWER("status")::"ShipmentStatus";

ALTER TABLE "shipments" ALTER COLUMN "schedule_type" DROP DEFAULT;
ALTER TABLE "shipments"
  ALTER COLUMN "schedule_type" TYPE "ShipmentScheduleType" USING LOWER("schedule_type")::"ShipmentScheduleType";
ALTER TABLE "shipments" ALTER COLUMN "schedule_type" SET DEFAULT 'instant';

ALTER TABLE "dispatch_batches"
  ALTER COLUMN "status" TYPE "DispatchBatchStatus" USING LOWER("status")::"DispatchBatchStatus";

ALTER TABLE "dispatch_offers"
  ALTER COLUMN "status" TYPE "DispatchOfferStatus" USING LOWER("status")::"DispatchOfferStatus";

ALTER TABLE "job_assignments"
  ALTER COLUMN "status" TYPE "ShipmentAssignmentStatus" USING LOWER("status")::"ShipmentAssignmentStatus";

ALTER TABLE "job_bids" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "job_bids"
  ALTER COLUMN "status" TYPE "BidStatus" USING LOWER("status")::"BidStatus";
ALTER TABLE "job_bids" ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "job_events"
  ALTER COLUMN "event_type" TYPE "ShipmentEventType" USING LOWER("event_type")::"ShipmentEventType",
  ALTER COLUMN "actor_role" TYPE "ShipmentActorRole" USING (
    CASE
      WHEN "actor_role" IS NULL THEN NULL
      ELSE LOWER("actor_role")::"ShipmentActorRole"
    END
  );

ALTER TABLE "job_milestones"
  ALTER COLUMN "type" TYPE "ShipmentMilestoneType" USING LOWER("type")::"ShipmentMilestoneType",
  ALTER COLUMN "status" TYPE "ShipmentMilestoneStatus" USING LOWER("status")::"ShipmentMilestoneStatus";

ALTER TABLE "otp_challenges" ALTER COLUMN "purpose" DROP DEFAULT;
ALTER TABLE "otp_challenges"
  ALTER COLUMN "purpose" TYPE "OtpPurpose" USING LOWER("purpose")::"OtpPurpose";
ALTER TABLE "otp_challenges" ALTER COLUMN "purpose" SET DEFAULT 'delivery_completion';

ALTER TABLE "pod_uploads"
  ALTER COLUMN "type" TYPE "PodUploadType" USING LOWER("type")::"PodUploadType";

ALTER TABLE "waybills" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "waybills"
  ALTER COLUMN "status" TYPE "WaybillStatus" USING LOWER("status")::"WaybillStatus";
ALTER TABLE "waybills" ALTER COLUMN "status" SET DEFAULT 'uploaded';

ALTER TABLE "vehicles"
  ALTER COLUMN "category" TYPE "VehicleCategory" USING LOWER("category")::"VehicleCategory";
