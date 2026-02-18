-- Add phone verification fields on profiles
ALTER TABLE "profiles"
  ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phone_verified_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "phone_verification_attempts" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "phone_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_card_methods" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "wallet_account_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "authorization_code" TEXT NOT NULL,
    "signature" TEXT,
    "card_type" TEXT,
    "bank" TEXT,
    "country_code" CHAR(2),
    "brand" TEXT,
    "first_6" TEXT,
    "last_4" TEXT,
    "exp_month" TEXT,
    "exp_year" TEXT,
    "reusable" BOOLEAN NOT NULL DEFAULT true,
    "customer_code" TEXT,
    "channel" TEXT,
    "metadata" JSONB,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_card_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_saved_bank_accounts" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "wallet_account_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number_masked" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "recipient_code" TEXT NOT NULL,
    "metadata" JSONB,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_saved_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_withdrawals" (
    "id" UUID NOT NULL,
    "wallet_account_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL,
    "bank_code" TEXT,
    "bank_name" TEXT,
    "account_number_masked" TEXT,
    "account_name" TEXT,
    "recipient_code" TEXT,
    "transfer_code" TEXT,
    "paystack_transfer_id" TEXT,
    "failure_reason" TEXT,
    "raw_init_response" JSONB,
    "raw_webhook" JSONB,
    "completed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "related_transaction_id" UUID,
    "saved_bank_account_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_idempotency_keys" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_verification_attempts_profile_id_created_at_idx" ON "phone_verification_attempts"("profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "phone_verification_attempts_phone_e164_created_at_idx" ON "phone_verification_attempts"("phone_e164", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_card_methods_authorization_code_key" ON "wallet_card_methods"("authorization_code");

-- CreateIndex
CREATE INDEX "wallet_card_methods_profile_id_created_at_idx" ON "wallet_card_methods"("profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_card_methods_wallet_account_id_created_at_idx" ON "wallet_card_methods"("wallet_account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_saved_bank_accounts_profile_id_created_at_idx" ON "wallet_saved_bank_accounts"("profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_saved_bank_accounts_wallet_account_id_created_at_idx" ON "wallet_saved_bank_accounts"("wallet_account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_saved_bank_accounts_recipient_code_idx" ON "wallet_saved_bank_accounts"("recipient_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_withdrawals_reference_key" ON "wallet_withdrawals"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_withdrawals_related_transaction_id_key" ON "wallet_withdrawals"("related_transaction_id");

-- CreateIndex
CREATE INDEX "wallet_withdrawals_wallet_account_id_created_at_idx" ON "wallet_withdrawals"("wallet_account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_withdrawals_profile_id_created_at_idx" ON "wallet_withdrawals"("profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_withdrawals_status_created_at_idx" ON "wallet_withdrawals"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_idempotency_keys_profile_id_operation_key_key" ON "wallet_idempotency_keys"("profile_id", "operation", "key");

-- CreateIndex
CREATE INDEX "wallet_idempotency_keys_profile_id_created_at_idx" ON "wallet_idempotency_keys"("profile_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "phone_verification_attempts" ADD CONSTRAINT "phone_verification_attempts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_card_methods" ADD CONSTRAINT "wallet_card_methods_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_card_methods" ADD CONSTRAINT "wallet_card_methods_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_saved_bank_accounts" ADD CONSTRAINT "wallet_saved_bank_accounts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_saved_bank_accounts" ADD CONSTRAINT "wallet_saved_bank_accounts_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_saved_bank_account_id_fkey" FOREIGN KEY ("saved_bank_account_id") REFERENCES "wallet_saved_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_idempotency_keys" ADD CONSTRAINT "wallet_idempotency_keys_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
