/*
  Warnings:

  - You are about to drop the column `job_id` on the `dispatch_batches` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `otp_challenges` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `pod_uploads` table. All the data in the column will be lost.
  - You are about to drop the column `related_job_id` on the `provider_penalties` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `ratings` table. All the data in the column will be lost.
  - You are about to drop the column `initiated_by` on the `refunds` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `refunds` table. All the data in the column will be lost.
  - You are about to drop the column `related_job_id` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `waybills` table. All the data in the column will be lost.
  - You are about to drop the `bid_awards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_bids` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_financials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_milestones` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shipment_id]` on the table `dispatch_batches` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shipment_id]` on the table `otp_challenges` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shipment_id]` on the table `ratings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shipment_id` to the `dispatch_batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `dispatch_batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `dispatch_offers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `dispatch_offers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `kyc_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `nin_verifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `otp_challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `pod_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `provider_kyc_cases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiated_by_profile_id` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_id` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `wallet_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipment_id` to the `waybills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bid_awards" DROP CONSTRAINT "bid_awards_awarded_by_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "bid_awards" DROP CONSTRAINT "bid_awards_bid_id_fkey";

-- DropForeignKey
ALTER TABLE "bid_awards" DROP CONSTRAINT "bid_awards_job_id_fkey";

-- DropForeignKey
ALTER TABLE "dispatch_batches" DROP CONSTRAINT "dispatch_batches_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_driver_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "job_bids" DROP CONSTRAINT "job_bids_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_bids" DROP CONSTRAINT "job_bids_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "job_events" DROP CONSTRAINT "job_events_actor_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "job_events" DROP CONSTRAINT "job_events_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_financials" DROP CONSTRAINT "job_financials_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_items" DROP CONSTRAINT "job_items_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_milestones" DROP CONSTRAINT "job_milestones_job_id_fkey";

-- DropForeignKey
ALTER TABLE "otp_challenges" DROP CONSTRAINT "otp_challenges_job_id_fkey";

-- DropForeignKey
ALTER TABLE "pod_uploads" DROP CONSTRAINT "pod_uploads_job_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_penalties" DROP CONSTRAINT "provider_penalties_related_job_id_fkey";

-- DropForeignKey
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_job_id_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_initiated_by_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_job_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_related_job_id_fkey";

-- DropForeignKey
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_job_id_fkey";

-- DropIndex
DROP INDEX "dispatch_batches_job_id_key";

-- DropIndex
DROP INDEX "otp_challenges_job_id_key";

-- DropIndex
DROP INDEX "pod_uploads_job_id_created_at_idx";

-- DropIndex
DROP INDEX "ratings_job_id_key";

-- DropIndex
DROP INDEX "refunds_job_id_idx";

-- DropIndex
DROP INDEX "wallet_transactions_related_job_id_idx";

-- DropIndex
DROP INDEX "waybills_job_id_idx";

-- AlterTable
ALTER TABLE "dispatch_batches" DROP COLUMN "job_id",
ADD COLUMN     "shipment_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'open';

-- AlterTable
ALTER TABLE "dispatch_offers" ADD COLUMN     "shipment_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'sent';

-- AlterTable
ALTER TABLE "kyc_documents" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "nin_verifications" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "otp_challenges" DROP COLUMN "job_id",
ADD COLUMN     "shipment_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payment_intents" ADD COLUMN     "confirmed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "pod_uploads" DROP COLUMN "job_id",
ADD COLUMN     "shipment_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "provider_kyc_cases" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "provider_penalties" DROP COLUMN "related_job_id",
ADD COLUMN     "related_shipment_id" UUID;

-- AlterTable
ALTER TABLE "ratings" DROP COLUMN "job_id",
ADD COLUMN     "shipment_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "refunds" DROP COLUMN "initiated_by",
DROP COLUMN "job_id",
ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by_profile_id" UUID,
ADD COLUMN     "initiated_by_profile_id" UUID NOT NULL,
ADD COLUMN     "processed_at" TIMESTAMPTZ(6),
ADD COLUMN     "shipment_id" UUID NOT NULL,
ADD COLUMN     "transaction_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "shipments" RENAME CONSTRAINT "jobs_pkey" TO "shipments_pkey";

-- AlterTable
ALTER TABLE "user_addresses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "wallet_accounts" ADD COLUMN     "escrow_minor" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "wallet_transactions" DROP COLUMN "related_job_id",
ADD COLUMN     "related_shipment_id" UUID,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "waybills" DROP COLUMN "job_id",
ADD COLUMN     "shipment_id" UUID NOT NULL;

-- DropTable
DROP TABLE "bid_awards";

-- DropTable
DROP TABLE "job_assignments";

-- DropTable
DROP TABLE "job_bids";

-- DropTable
DROP TABLE "job_events";

-- DropTable
DROP TABLE "job_financials";

-- DropTable
DROP TABLE "job_items";

-- DropTable
DROP TABLE "job_milestones";

-- CreateTable
CREATE TABLE "shipment_assignments" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "driver_profile_id" UUID,
    "dispatch_offer_id" UUID,
    "status" "ShipmentAssignmentStatus" NOT NULL DEFAULT 'active',
    "agreed_price_minor" BIGINT,
    "currency" CHAR(3),
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight_kg" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "event_type" "ShipmentEventType" NOT NULL,
    "actor_profile_id" UUID,
    "actor_role" "ShipmentActorRole",
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_bids" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "message" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipment_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_bid_awards" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "bid_id" UUID NOT NULL,
    "awarded_by_profile_id" UUID NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "shipment_bid_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_milestones" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "type" "ShipmentMilestoneType" NOT NULL,
    "status" "ShipmentMilestoneStatus" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_financials" (
    "shipment_id" UUID NOT NULL,
    "customer_charge_minor" BIGINT NOT NULL,
    "provider_earnings_minor" BIGINT NOT NULL,
    "commission_amount_minor" BIGINT NOT NULL,
    "refunded_minor" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipment_financials_pkey" PRIMARY KEY ("shipment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_assignments_shipment_id_key" ON "shipment_assignments"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_assignments_dispatch_offer_id_key" ON "shipment_assignments"("dispatch_offer_id");

-- CreateIndex
CREATE INDEX "shipment_assignments_provider_id_assigned_at_idx" ON "shipment_assignments"("provider_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_assignments_driver_profile_id_assigned_at_idx" ON "shipment_assignments"("driver_profile_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_events_shipment_id_created_at_idx" ON "shipment_events"("shipment_id", "created_at");

-- CreateIndex
CREATE INDEX "shipment_events_event_type_created_at_idx" ON "shipment_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "shipment_bids_shipment_id_amount_minor_idx" ON "shipment_bids"("shipment_id", "amount_minor" ASC);

-- CreateIndex
CREATE INDEX "shipment_bids_provider_id_created_at_idx" ON "shipment_bids"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_bids_shipment_id_provider_id_key" ON "shipment_bids"("shipment_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_bid_awards_shipment_id_key" ON "shipment_bid_awards"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_bid_awards_bid_id_key" ON "shipment_bid_awards"("bid_id");

-- CreateIndex
CREATE INDEX "shipment_milestones_shipment_id_idx" ON "shipment_milestones"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_milestones_shipment_id_type_key" ON "shipment_milestones"("shipment_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_batches_shipment_id_key" ON "dispatch_batches"("shipment_id");

-- CreateIndex
CREATE INDEX "dispatch_offers_shipment_id_status_idx" ON "dispatch_offers"("shipment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "otp_challenges_shipment_id_key" ON "otp_challenges"("shipment_id");

-- CreateIndex
CREATE INDEX "pod_uploads_shipment_id_created_at_idx" ON "pod_uploads"("shipment_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_shipment_id_key" ON "ratings"("shipment_id");

-- CreateIndex
CREATE INDEX "refunds_shipment_id_idx" ON "refunds"("shipment_id");

-- CreateIndex
CREATE INDEX "refunds_transaction_id_idx" ON "refunds"("transaction_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_related_shipment_id_idx" ON "wallet_transactions"("related_shipment_id");

-- CreateIndex
CREATE INDEX "waybills_shipment_id_idx" ON "waybills"("shipment_id");

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "jobs_cancelled_by_profile_id_fkey" TO "shipments_cancelled_by_profile_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "jobs_customer_profile_id_fkey" TO "shipments_customer_profile_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "jobs_dropoff_location_id_fkey" TO "shipments_dropoff_address_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "jobs_pickup_location_id_fkey" TO "shipments_pickup_address_id_fkey";

-- AddForeignKey
ALTER TABLE "dispatch_batches" ADD CONSTRAINT "dispatch_batches_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assignments" ADD CONSTRAINT "shipment_assignments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assignments" ADD CONSTRAINT "shipment_assignments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assignments" ADD CONSTRAINT "shipment_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assignments" ADD CONSTRAINT "shipment_assignments_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assignments" ADD CONSTRAINT "shipment_assignments_dispatch_offer_id_fkey" FOREIGN KEY ("dispatch_offer_id") REFERENCES "dispatch_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_bids" ADD CONSTRAINT "shipment_bids_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_bids" ADD CONSTRAINT "shipment_bids_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_bid_awards" ADD CONSTRAINT "shipment_bid_awards_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_bid_awards" ADD CONSTRAINT "shipment_bid_awards_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "shipment_bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_bid_awards" ADD CONSTRAINT "shipment_bid_awards_awarded_by_profile_id_fkey" FOREIGN KEY ("awarded_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pod_uploads" ADD CONSTRAINT "pod_uploads_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_penalties" ADD CONSTRAINT "provider_penalties_related_shipment_id_fkey" FOREIGN KEY ("related_shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_related_shipment_id_fkey" FOREIGN KEY ("related_shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_financials" ADD CONSTRAINT "shipment_financials_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_profile_id_fkey" FOREIGN KEY ("initiated_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_profile_id_fkey" FOREIGN KEY ("approved_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "jobs_customer_profile_id_created_at_idx" RENAME TO "shipments_customer_profile_id_created_at_idx";

-- RenameIndex
ALTER INDEX "jobs_public_code_key" RENAME TO "shipments_tracking_code_key";

-- RenameIndex
ALTER INDEX "jobs_status_vehicle_category_mode_idx" RENAME TO "shipments_status_vehicle_category_mode_idx";
