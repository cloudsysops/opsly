-- Monthly Subscriptions ("Mensualidad") for Classes
-- Allows families to pay monthly for class access

BEGIN;

-- Monthly subscription plans
CREATE TABLE IF NOT EXISTS peskids.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  monthly_price_cents integer NOT NULL,
  currency text DEFAULT 'COP',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date date NOT NULL,
  renewal_date date NOT NULL,
  cancelled_date date,
  referral_code_used text,
  discount_cents integer DEFAULT 0,
  final_monthly_amount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_student
  ON peskids.subscriptions (tenant_slug, student_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON peskids.subscriptions (tenant_slug, status, renewal_date);

CREATE INDEX IF NOT EXISTS idx_subscriptions_referral
  ON peskids.subscriptions (tenant_slug, referral_code_used);

-- Subscription payment history (each monthly charge)
CREATE TABLE IF NOT EXISTS peskids.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES peskids.subscriptions(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount_cents integer NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  wompi_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription
  ON peskids.subscription_payments (subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_date
  ON peskids.subscription_payments (subscription_id, payment_date DESC);

-- Enable RLS
ALTER TABLE peskids.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
DROP POLICY IF EXISTS "service_role_all_subscriptions" ON peskids.subscriptions;
CREATE POLICY "service_role_all_subscriptions"
  ON peskids.subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_subscription_payments" ON peskids.subscription_payments;
CREATE POLICY "service_role_all_subscription_payments"
  ON peskids.subscription_payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.subscription_payments TO service_role;

COMMIT;
