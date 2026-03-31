DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'UserRole'
  ) THEN
    CREATE TYPE "UserRole" AS ENUM (
      'shipper',
      'rider',
      'van_driver',
      'truck_driver',
      'admin'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum enum_value
    JOIN pg_type enum_type
      ON enum_type.oid = enum_value.enumtypid
    WHERE enum_type.typname = 'State'
      AND enum_value.enumlabel = 'Abuja'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum enum_value
    JOIN pg_type enum_type
      ON enum_type.oid = enum_value.enumtypid
    WHERE enum_type.typname = 'State'
      AND enum_value.enumlabel = 'FederalCapitalTerritory'
  ) THEN
    ALTER TYPE "State" RENAME VALUE 'Abuja' TO 'FederalCapitalTerritory';
  END IF;
END
$$;

ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Abia';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Adamawa';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'AkwaIbom';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Anambra';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Bauchi';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Bayelsa';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Benue';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Borno';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'CrossRiver';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Delta';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Ebonyi';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Edo';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Ekiti';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Enugu';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Gombe';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Imo';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Jigawa';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Kaduna';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Kano';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Katsina';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Kebbi';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Kogi';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Kwara';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Nasarawa';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Niger';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Ogun';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Ondo';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Osun';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Plateau';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Rivers';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Sokoto';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Taraba';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Yobe';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'Zamfara';
ALTER TYPE "State" ADD VALUE IF NOT EXISTS 'FederalCapitalTerritory';

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "user_role" "UserRole";

ALTER TABLE "providers"
  ADD COLUMN IF NOT EXISTS "driver_type" "VehicleCategory";

ALTER TABLE "profiles"
  ALTER COLUMN "state" DROP NOT NULL;

WITH ranked_provider_profiles AS (
  SELECT
    source.profile_id,
    source.driver_category,
    ROW_NUMBER() OVER (
      PARTITION BY source.profile_id
      ORDER BY source.updated_at DESC NULLS LAST, source.provider_id DESC
    ) AS row_number
  FROM (
    SELECT
      p."contact_profile_id" AS profile_id,
      p."id" AS provider_id,
      COALESCE(
        p."driver_type",
        (
          SELECT v."category"
          FROM "vehicles" v
          WHERE v."provider_id" = p."id"
          ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
          LIMIT 1
        )
      ) AS driver_category,
      p."updated_at" AS updated_at
    FROM "providers" p
    WHERE p."contact_profile_id" IS NOT NULL

    UNION ALL

    SELECT
      pm."profile_id" AS profile_id,
      p."id" AS provider_id,
      COALESCE(
        p."driver_type",
        (
          SELECT v."category"
          FROM "vehicles" v
          WHERE v."provider_id" = p."id"
          ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
          LIMIT 1
        )
      ) AS driver_category,
      p."updated_at" AS updated_at
    FROM "provider_members" pm
    JOIN "providers" p
      ON p."id" = pm."provider_id"
    WHERE pm."status" = 'active'
  ) AS source
  WHERE source.profile_id IS NOT NULL
),
provider_profiles AS (
  SELECT
    profile_id,
    driver_category
  FROM ranked_provider_profiles
  WHERE row_number = 1
)
UPDATE "profiles" profile
SET "user_role" = CASE
  WHEN profile."user_role" IS NOT NULL THEN profile."user_role"
  WHEN 'admin' = ANY(COALESCE(profile."user_roles", ARRAY[]::"UserType"[]))
    THEN 'admin'::"UserRole"
  WHEN provider_profiles.profile_id IS NOT NULL
    THEN CASE provider_profiles.driver_category
      WHEN 'bike' THEN 'rider'::"UserRole"
      WHEN 'van' THEN 'van_driver'::"UserRole"
      WHEN 'truck' THEN 'truck_driver'::"UserRole"
      ELSE NULL
    END
  WHEN 'individual' = ANY(COALESCE(profile."user_roles", ARRAY[]::"UserType"[]))
    THEN 'shipper'::"UserRole"
  ELSE NULL
END
FROM provider_profiles
WHERE provider_profiles.profile_id = profile."id";

UPDATE "profiles" profile
SET "user_role" = CASE
  WHEN 'admin' = ANY(COALESCE(profile."user_roles", ARRAY[]::"UserType"[]))
    THEN 'admin'::"UserRole"
  WHEN 'individual' = ANY(COALESCE(profile."user_roles", ARRAY[]::"UserType"[]))
    THEN 'shipper'::"UserRole"
  ELSE profile."user_role"
END
WHERE profile."user_role" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "providers" provider
    WHERE provider."contact_profile_id" = profile."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "provider_members" provider_member
    WHERE provider_member."profile_id" = profile."id"
      AND provider_member."status" = 'active'
  );

ALTER TABLE "profiles"
  DROP COLUMN IF EXISTS "user_roles";

WITH ranked_vehicles AS (
  SELECT
    v."id",
    v."provider_id",
    FIRST_VALUE(v."id") OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS keep_vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS row_number
  FROM "vehicles" v
),
duplicate_vehicles AS (
  SELECT
    "id",
    "keep_vehicle_id"
  FROM ranked_vehicles
  WHERE row_number > 1
)
UPDATE "dispatch_offers" dispatch_offer
SET "vehicle_id" = duplicate_vehicles."keep_vehicle_id"
FROM duplicate_vehicles
WHERE dispatch_offer."vehicle_id" = duplicate_vehicles."id";

WITH ranked_vehicles AS (
  SELECT
    v."id",
    v."provider_id",
    FIRST_VALUE(v."id") OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS keep_vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS row_number
  FROM "vehicles" v
),
duplicate_vehicles AS (
  SELECT
    "id",
    "keep_vehicle_id"
  FROM ranked_vehicles
  WHERE row_number > 1
)
UPDATE "shipment_assignments" assignment
SET "vehicle_id" = duplicate_vehicles."keep_vehicle_id"
FROM duplicate_vehicles
WHERE assignment."vehicle_id" = duplicate_vehicles."id";

WITH ranked_vehicles AS (
  SELECT
    v."id",
    v."provider_id",
    FIRST_VALUE(v."id") OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS keep_vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS row_number
  FROM "vehicles" v
),
duplicate_vehicles AS (
  SELECT
    "id",
    "keep_vehicle_id"
  FROM ranked_vehicles
  WHERE row_number > 1
)
UPDATE "provider_kyc_checks" kyc_check
SET "vehicle_id" = duplicate_vehicles."keep_vehicle_id"
FROM duplicate_vehicles
WHERE kyc_check."vehicle_id" = duplicate_vehicles."id";

WITH ranked_vehicles AS (
  SELECT
    v."id",
    v."provider_id",
    ROW_NUMBER() OVER (
      PARTITION BY v."provider_id"
      ORDER BY v."updated_at" DESC, v."created_at" DESC, v."id" DESC
    ) AS row_number
  FROM "vehicles" v
)
DELETE FROM "vehicles" vehicle
USING ranked_vehicles
WHERE ranked_vehicles."id" = vehicle."id"
  AND ranked_vehicles.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_provider_id_key"
  ON "vehicles"("provider_id");

INSERT INTO "platform_configs" (
  "id",
  "key",
  "value",
  "description",
  "updated_by_profile_id",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),
  'available_states',
  to_jsonb(ARRAY[
    'Abia',
    'Adamawa',
    'AkwaIbom',
    'Anambra',
    'Bauchi',
    'Bayelsa',
    'Benue',
    'Borno',
    'CrossRiver',
    'Delta',
    'Ebonyi',
    'Edo',
    'Ekiti',
    'Enugu',
    'Gombe',
    'Imo',
    'Jigawa',
    'Kaduna',
    'Kano',
    'Katsina',
    'Kebbi',
    'Kogi',
    'Kwara',
    'Lagos',
    'Nasarawa',
    'Niger',
    'Ogun',
    'Ondo',
    'Osun',
    'Oyo',
    'Plateau',
    'Rivers',
    'Sokoto',
    'Taraba',
    'Yobe',
    'Zamfara',
    'FederalCapitalTerritory'
  ]::text[]),
  'Globally enabled operating states for user and driver state selection',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;
