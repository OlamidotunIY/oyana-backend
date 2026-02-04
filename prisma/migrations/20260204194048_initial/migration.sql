-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "phone_e164" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "status" "ProfileStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "profile_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("profile_id","role_id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "ip" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_batches" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "opened_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_offers" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "responded_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "provider_eta_minutes" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assignments" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "driver_profile_id" UUID,
    "status" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_reason" TEXT,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "label" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "public_code" TEXT NOT NULL,
    "customer_profile_id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "vehicle_category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pickup_location_id" UUID NOT NULL,
    "dropoff_location_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6),
    "package_description" TEXT,
    "package_value_minor" BIGINT DEFAULT 0,
    "special_instructions" TEXT,
    "pricing_currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "quoted_price_minor" BIGINT,
    "final_price_minor" BIGINT,
    "commission_rate_bps" INTEGER NOT NULL DEFAULT 0,
    "commission_amount_minor" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_profile_id" UUID,
    "cancellation_reason" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_items" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight_kg" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_profile_id" UUID,
    "actor_role" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_bids" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_awards" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "bid_id" UUID NOT NULL,
    "awarded_by_profile_id" UUID NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "bid_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_milestones" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'delivery_completion',
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pod_uploads" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pod_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waybills" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT,
    "contact_profile_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "min_wallet_threshold_minor" BIGINT NOT NULL DEFAULT 0,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_members" (
    "provider_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_members_pkey" PRIMARY KEY ("provider_id","profile_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "plate_number" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "capacity_kg" INTEGER,
    "capacity_volume_cm3" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_kyc_cases" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_kyc_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "kyc_case_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nin_verifications" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "nin_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "vendor_reference" TEXT,
    "requested_at" TIMESTAMPTZ(6),
    "verified_at" TIMESTAMPTZ(6),
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nin_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "rated_by_profile_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_rules" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "vehicle_category" TEXT,
    "provider_id" UUID,
    "value" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_penalties" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "related_job_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_profile_id" UUID,
    "owner_provider_id" UUID,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "balance_minor" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_account_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "related_job_id" UUID,
    "related_payment_intent_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL,
    "wallet_account_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL,
    "paystack_reference" TEXT,
    "authorization_url" TEXT,
    "raw_init_response" JSONB,
    "raw_webhook" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_financials" (
    "job_id" UUID NOT NULL,
    "customer_charge_minor" BIGINT NOT NULL,
    "provider_earnings_minor" BIGINT NOT NULL,
    "commission_amount_minor" BIGINT NOT NULL,
    "refunded_minor" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_financials_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "initiated_by" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_e164_key" ON "profiles"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_profile_id_idx" ON "user_roles"("profile_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "admin_sessions_profile_id_idx" ON "admin_sessions"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_batches_job_id_key" ON "dispatch_batches"("job_id");

-- CreateIndex
CREATE INDEX "dispatch_batches_status_expires_at_idx" ON "dispatch_batches"("status", "expires_at");

-- CreateIndex
CREATE INDEX "dispatch_offers_batch_id_status_idx" ON "dispatch_offers"("batch_id", "status");

-- CreateIndex
CREATE INDEX "dispatch_offers_provider_id_status_expires_at_idx" ON "dispatch_offers"("provider_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_offers_batch_id_provider_id_key" ON "dispatch_offers"("batch_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_job_id_key" ON "job_assignments"("job_id");

-- CreateIndex
CREATE INDEX "job_assignments_provider_id_assigned_at_idx" ON "job_assignments"("provider_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "locations_lat_lng_idx" ON "locations"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_public_code_key" ON "jobs"("public_code");

-- CreateIndex
CREATE INDEX "jobs_customer_profile_id_created_at_idx" ON "jobs"("customer_profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_status_vehicle_category_mode_idx" ON "jobs"("status", "vehicle_category", "mode");

-- CreateIndex
CREATE INDEX "job_items_job_id_idx" ON "job_items"("job_id");

-- CreateIndex
CREATE INDEX "job_events_job_id_created_at_idx" ON "job_events"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "job_events_event_type_created_at_idx" ON "job_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "job_bids_job_id_amount_minor_idx" ON "job_bids"("job_id", "amount_minor" ASC);

-- CreateIndex
CREATE INDEX "job_bids_provider_id_created_at_idx" ON "job_bids"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_bids_job_id_provider_id_key" ON "job_bids"("job_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "bid_awards_job_id_key" ON "bid_awards"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "bid_awards_bid_id_key" ON "bid_awards"("bid_id");

-- CreateIndex
CREATE INDEX "job_milestones_job_id_idx" ON "job_milestones"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_milestones_job_id_type_key" ON "job_milestones"("job_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "otp_challenges_job_id_key" ON "otp_challenges"("job_id");

-- CreateIndex
CREATE INDEX "pod_uploads_job_id_created_at_idx" ON "pod_uploads"("job_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "waybills_job_id_idx" ON "waybills"("job_id");

-- CreateIndex
CREATE INDEX "providers_status_idx" ON "providers"("status");

-- CreateIndex
CREATE INDEX "providers_priority_score_rating_avg_idx" ON "providers"("priority_score" DESC, "rating_avg" DESC);

-- CreateIndex
CREATE INDEX "vehicles_provider_id_category_status_idx" ON "vehicles"("provider_id", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "provider_kyc_cases_provider_id_status_idx" ON "provider_kyc_cases"("provider_id", "status");

-- CreateIndex
CREATE INDEX "kyc_documents_kyc_case_id_doc_type_idx" ON "kyc_documents"("kyc_case_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_documents_storage_bucket_storage_path_key" ON "kyc_documents"("storage_bucket", "storage_path");

-- CreateIndex
CREATE INDEX "nin_verifications_provider_id_status_idx" ON "nin_verifications"("provider_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_job_id_key" ON "ratings"("job_id");

-- CreateIndex
CREATE INDEX "ratings_provider_id_created_at_idx" ON "ratings"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sla_rules_key_key" ON "sla_rules"("key");

-- CreateIndex
CREATE INDEX "provider_penalties_provider_id_created_at_idx" ON "provider_penalties"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_accounts_owner_type_owner_profile_id_idx" ON "wallet_accounts"("owner_type", "owner_profile_id");

-- CreateIndex
CREATE INDEX "wallet_accounts_owner_type_owner_provider_id_idx" ON "wallet_accounts"("owner_type", "owner_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_account_id_created_at_idx" ON "wallet_transactions"("wallet_account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_related_job_id_idx" ON "wallet_transactions"("related_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_paystack_reference_key" ON "payment_intents"("paystack_reference");

-- CreateIndex
CREATE INDEX "payment_intents_wallet_account_id_created_at_idx" ON "payment_intents"("wallet_account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE INDEX "refunds_job_id_idx" ON "refunds"("job_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_batches" ADD CONSTRAINT "dispatch_batches_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "dispatch_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_dropoff_location_id_fkey" FOREIGN KEY ("dropoff_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cancelled_by_profile_id_fkey" FOREIGN KEY ("cancelled_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_bids" ADD CONSTRAINT "job_bids_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_bids" ADD CONSTRAINT "job_bids_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_awards" ADD CONSTRAINT "bid_awards_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_awards" ADD CONSTRAINT "bid_awards_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "job_bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_awards" ADD CONSTRAINT "bid_awards_awarded_by_profile_id_fkey" FOREIGN KEY ("awarded_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_milestones" ADD CONSTRAINT "job_milestones_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pod_uploads" ADD CONSTRAINT "pod_uploads_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pod_uploads" ADD CONSTRAINT "pod_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_contact_profile_id_fkey" FOREIGN KEY ("contact_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_members" ADD CONSTRAINT "provider_members_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_members" ADD CONSTRAINT "provider_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_kyc_cases" ADD CONSTRAINT "provider_kyc_cases_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_kyc_cases" ADD CONSTRAINT "provider_kyc_cases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "provider_kyc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nin_verifications" ADD CONSTRAINT "nin_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rated_by_profile_id_fkey" FOREIGN KEY ("rated_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_rules" ADD CONSTRAINT "sla_rules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_penalties" ADD CONSTRAINT "provider_penalties_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_penalties" ADD CONSTRAINT "provider_penalties_related_job_id_fkey" FOREIGN KEY ("related_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_owner_provider_id_fkey" FOREIGN KEY ("owner_provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_related_job_id_fkey" FOREIGN KEY ("related_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_related_payment_intent_id_fkey" FOREIGN KEY ("related_payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_financials" ADD CONSTRAINT "job_financials_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
