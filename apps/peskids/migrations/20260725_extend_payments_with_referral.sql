-- Extend peskids.payments table to track referral discount redemptions
-- This allows discount tracking on class enrollment payments

BEGIN;

-- Add referral discount columns to payments table (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'peskids' AND table_name = 'payments'
    AND column_name = 'referral_code_used'
  ) THEN
    ALTER TABLE peskids.payments ADD COLUMN referral_code_used text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'peskids' AND table_name = 'payments'
    AND column_name = 'discount_cents'
  ) THEN
    ALTER TABLE peskids.payments ADD COLUMN discount_cents integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'peskids' AND table_name = 'payments'
    AND column_name = 'final_amount_cents'
  ) THEN
    ALTER TABLE peskids.payments ADD COLUMN final_amount_cents integer;
  END IF;
END $$;

-- Create index on referral_code_used if not exists
CREATE INDEX IF NOT EXISTS idx_payments_referral_code
  ON peskids.payments (referral_code_used)
  WHERE referral_code_used IS NOT NULL;

-- Add comment explaining the new columns
COMMENT ON COLUMN peskids.payments.referral_code_used IS
  'Referral code applied to this payment (e.g., PK-XXXXX) for 10% discount tracking';

COMMENT ON COLUMN peskids.payments.discount_cents IS
  'Discount amount in cents (10% of payment amount when referral applied)';

COMMENT ON COLUMN peskids.payments.final_amount_cents IS
  'Final amount charged after discount application';

COMMIT;
