-- Student Points System
-- Accumulate points for purchases and redeem for 10% discount
-- 1 point = 10,000 COP invested in Peskids

BEGIN;

-- Student points balance
CREATE TABLE IF NOT EXISTS peskids.student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  current_balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_points_tenant_student
  ON peskids.student_points (tenant_slug, student_id);

-- Point transaction audit log
CREATE TABLE IF NOT EXISTS peskids.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'redeemed')),
  points_amount integer NOT NULL,
  description text,
  related_order_id uuid REFERENCES peskids.store_orders(id) ON DELETE SET NULL,
  related_subscription_id uuid REFERENCES peskids.subscriptions(id) ON DELETE SET NULL,
  related_payment_id uuid REFERENCES peskids.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_tenant_student
  ON peskids.point_transactions (tenant_slug, student_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_type
  ON peskids.point_transactions (tenant_slug, transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_date
  ON peskids.point_transactions (student_id, created_at DESC);

-- Add comment
COMMENT ON TABLE peskids.student_points IS
  'Student point balance. 1 point = 10,000 COP invested. 10 points = 10% discount.';

COMMENT ON COLUMN peskids.student_points.current_balance IS
  'Current available points (earned - redeemed)';

COMMENT ON COLUMN peskids.point_transactions.transaction_type IS
  'earned: gained from purchases (COP/10000). redeemed: used for discount (10pts = 10%)';

COMMENT ON COLUMN peskids.point_transactions.description IS
  'Human-readable description: "Compra uniforme", "Descuento en mensualidad", etc.';

-- Enable RLS
ALTER TABLE peskids.student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.point_transactions ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
DROP POLICY IF EXISTS "service_role_all_student_points" ON peskids.student_points;
CREATE POLICY "service_role_all_student_points"
  ON peskids.student_points
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_point_transactions" ON peskids.point_transactions;
CREATE POLICY "service_role_all_point_transactions"
  ON peskids.point_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.student_points TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.point_transactions TO service_role;

COMMIT;
