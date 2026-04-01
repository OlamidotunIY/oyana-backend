-- CreateEnum: AccountRole
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountRole') THEN
    CREATE TYPE "AccountRole" AS ENUM ('user', 'admin');
  END IF;
END
$$;

-- CreateEnum: AppMode
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppMode') THEN
    CREATE TYPE "AppMode" AS ENUM ('shipper', 'driver');
  END IF;
END
$$;

-- AlterTable: add account_role to profiles
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "account_role" "AccountRole" NOT NULL DEFAULT 'user';

-- AlterTable: add active_app_mode to profiles
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "active_app_mode" "AppMode" NOT NULL DEFAULT 'shipper';
