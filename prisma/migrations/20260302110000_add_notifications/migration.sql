-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('customer', 'provider', 'admin');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('shipment', 'dispatch', 'support', 'dispute', 'system');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_profile_id" UUID NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_profile_id_created_at_idx" ON "notifications"("recipient_profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_audience_is_read_created_at_idx" ON "notifications"("audience", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_category_created_at_idx" ON "notifications"("category", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipient_profile_id_fkey"
FOREIGN KEY ("recipient_profile_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
