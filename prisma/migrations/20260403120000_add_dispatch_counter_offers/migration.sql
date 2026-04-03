ALTER TYPE "DispatchOfferStatus" ADD VALUE IF NOT EXISTS 'countered';

ALTER TABLE "dispatch_offers"
ADD COLUMN "counter_amount_minor" BIGINT,
ADD COLUMN "counter_currency" CHAR(3),
ADD COLUMN "counter_message" TEXT,
ADD COLUMN "countered_at" TIMESTAMPTZ(6);
