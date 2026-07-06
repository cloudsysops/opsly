-- Peskids: add Wompi (Colombia) as a parallel payment provider alongside Stripe.
-- Stripe stays the default; families can choose Wompi (PSE/Nequi/tarjeta local) at checkout.

ALTER TABLE peskids.class_enrollments
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe', 'wompi'));

ALTER TABLE peskids.class_enrollments
  ADD COLUMN IF NOT EXISTS wompi_transaction_id text;

ALTER TABLE peskids.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe'
    CHECK (provider IN ('stripe', 'wompi'));

ALTER TABLE peskids.payments
  ADD COLUMN IF NOT EXISTS wompi_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_payments_wompi_transaction
  ON peskids.payments (wompi_transaction_id)
  WHERE wompi_transaction_id IS NOT NULL;
