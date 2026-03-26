-- AlterTable
ALTER TABLE "otp_codes" ADD COLUMN     "phone_e164" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "notification_prompted_at" TIMESTAMPTZ(6),
ADD COLUMN     "notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "push_permission_granted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "push_permission_status" TEXT;

-- CreateTable
CREATE TABLE "push_devices" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "device_id" TEXT,
    "platform" TEXT,
    "app_version" TEXT,
    "push_permission_status" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_expo_push_token_key" ON "push_devices"("expo_push_token");

-- CreateIndex
CREATE INDEX "push_devices_profile_id_is_active_idx" ON "push_devices"("profile_id", "is_active");

-- CreateIndex
CREATE INDEX "push_devices_profile_id_last_seen_at_idx" ON "push_devices"("profile_id", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "otp_codes_phone_e164_idx" ON "otp_codes"("phone_e164");

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
