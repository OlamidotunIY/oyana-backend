DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'DriverComplianceDocumentType'
  ) AND EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DriverComplianceDocumentType'
      AND e.enumlabel = 'vehicle_registration'
  ) THEN
    DELETE FROM "driver_compliance_documents"
    WHERE "type"::text = 'vehicle_registration';

    ALTER TYPE "DriverComplianceDocumentType" RENAME TO "DriverComplianceDocumentType_old";
    CREATE TYPE "DriverComplianceDocumentType" AS ENUM (
      'selfie',
      'driver_license',
      'identity_document',
      'nin',
      'insurance',
      'proof_of_address'
    );

    ALTER TABLE "driver_compliance_documents"
      ALTER COLUMN "type" TYPE "DriverComplianceDocumentType"
      USING ("type"::text::"DriverComplianceDocumentType");

    DROP TYPE "DriverComplianceDocumentType_old";
  END IF;
END $$;

ALTER TABLE "provider_kyc_checks"
  DROP COLUMN IF EXISTS "vehicle_id";

ALTER TABLE "provider_kyc_profiles"
  DROP COLUMN IF EXISTS "vehicle_plate_status",
  DROP COLUMN IF EXISTS "vehicle_vin_status",
  DROP COLUMN IF EXISTS "vehicle_plate_verified_at",
  DROP COLUMN IF EXISTS "vehicle_vin_verified_at";

ALTER TABLE "dispatch_offers"
  DROP COLUMN IF EXISTS "vehicle_id";

ALTER TABLE "shipment_assignments"
  DROP COLUMN IF EXISTS "vehicle_id";

DROP TABLE IF EXISTS "driver_vehicles" CASCADE;
DROP TABLE IF EXISTS "vehicles" CASCADE;
