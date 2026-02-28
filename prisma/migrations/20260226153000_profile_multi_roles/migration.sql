ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "user_roles" "UserType"[] NOT NULL DEFAULT ARRAY['individual']::"UserType"[];

UPDATE "profiles"
SET "user_roles" = (
  SELECT ARRAY_AGG(DISTINCT role)
  FROM UNNEST(COALESCE("user_roles", ARRAY[]::"UserType"[]) || ARRAY["user_type"]::"UserType"[]) AS role
);

UPDATE "profiles"
SET "user_roles" = (
  SELECT ARRAY_AGG(DISTINCT role)
  FROM UNNEST("user_roles" || ARRAY['individual']::"UserType"[]) AS role
)
WHERE "user_type" = 'business';
