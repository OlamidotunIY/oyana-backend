-- AlterTable: make profiles.email nullable to support phone-only signups
ALTER TABLE "profiles"
  ALTER COLUMN "email" DROP NOT NULL;
