WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    balance_minor,
    escrow_minor,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
wallet_merge_totals AS (
  SELECT
    canonical_id,
    COALESCE(SUM(balance_minor), 0)::BIGINT AS total_balance_minor,
    COALESCE(SUM(escrow_minor), 0)::BIGINT AS total_escrow_minor
  FROM ranked_wallets
  GROUP BY canonical_id
)
UPDATE "wallet_accounts" AS target
SET
  balance_minor = totals.total_balance_minor,
  escrow_minor = totals.total_escrow_minor,
  updated_at = NOW()
FROM wallet_merge_totals AS totals
WHERE target.id = totals.canonical_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked_wallets
  WHERE rn > 1
)
UPDATE "wallet_transactions" AS records
SET wallet_account_id = duplicates.canonical_id
FROM duplicate_wallets AS duplicates
WHERE records.wallet_account_id = duplicates.duplicate_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked_wallets
  WHERE rn > 1
)
UPDATE "payment_intents" AS records
SET wallet_account_id = duplicates.canonical_id
FROM duplicate_wallets AS duplicates
WHERE records.wallet_account_id = duplicates.duplicate_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked_wallets
  WHERE rn > 1
)
UPDATE "wallet_card_methods" AS records
SET wallet_account_id = duplicates.canonical_id
FROM duplicate_wallets AS duplicates
WHERE records.wallet_account_id = duplicates.duplicate_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked_wallets
  WHERE rn > 1
)
UPDATE "wallet_saved_bank_accounts" AS records
SET wallet_account_id = duplicates.canonical_id
FROM duplicate_wallets AS duplicates
WHERE records.wallet_account_id = duplicates.duplicate_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked_wallets
  WHERE rn > 1
)
UPDATE "wallet_withdrawals" AS records
SET wallet_account_id = duplicates.canonical_id
FROM duplicate_wallets AS duplicates
WHERE records.wallet_account_id = duplicates.duplicate_id;

WITH ranked_wallets AS (
  SELECT
    id,
    owner_profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY owner_profile_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM "wallet_accounts"
  WHERE owner_profile_id IS NOT NULL
),
duplicate_wallets AS (
  SELECT id
  FROM ranked_wallets
  WHERE rn > 1
)
DELETE FROM "wallet_accounts" AS records
USING duplicate_wallets AS duplicates
WHERE records.id = duplicates.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_accounts_owner_profile_id_key'
  ) THEN
    ALTER TABLE "wallet_accounts"
      ADD CONSTRAINT "wallet_accounts_owner_profile_id_key"
      UNIQUE ("owner_profile_id");
  END IF;
END $$;
