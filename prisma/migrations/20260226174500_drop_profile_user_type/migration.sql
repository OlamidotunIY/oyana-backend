ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "user_roles" "UserType"[] NOT NULL DEFAULT ARRAY['individual']::"UserType"[];

UPDATE "profiles"
SET "user_roles" = (
  SELECT ARRAY_AGG(DISTINCT role)
  FROM UNNEST(COALESCE("user_roles", ARRAY[]::"UserType"[]) || ARRAY["user_type"]::"UserType"[]) AS role
)
WHERE "user_type" IS NOT NULL;

UPDATE "profiles"
SET "user_roles" = (
  SELECT ARRAY_AGG(DISTINCT role)
  FROM UNNEST(COALESCE("user_roles", ARRAY[]::"UserType"[]) || ARRAY['individual']::"UserType"[]) AS role
)
WHERE "user_type" = 'business';

UPDATE "profiles"
SET "user_roles" = ARRAY['individual']::"UserType"[]
WHERE "user_roles" IS NULL OR CARDINALITY("user_roles") = 0;

ALTER TABLE "profiles"
  DROP COLUMN IF EXISTS "user_type";
