-- Store System: Products, Cart, and Orders
-- Enables referral discount redemption on store purchases

BEGIN;

-- Store Products/Articles
CREATE TABLE IF NOT EXISTS peskids.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  category text NOT NULL CHECK (category IN ('utilities', 'merchandise', 'services')),
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text DEFAULT 'COP',
  image_url text,
  inventory_count integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_products_tenant_category
  ON peskids.store_products (tenant_slug, category);

CREATE INDEX IF NOT EXISTS idx_store_products_active
  ON peskids.store_products (tenant_slug, active, created_at DESC);

-- Shopping Cart (temporary, cleared after order)
CREATE TABLE IF NOT EXISTS peskids.store_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES peskids.store_products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_slug, student_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_cart_items_student
  ON peskids.store_cart_items (tenant_slug, student_id);

-- Store Orders
CREATE TABLE IF NOT EXISTS peskids.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  total_cents integer NOT NULL,
  discount_cents integer DEFAULT 0,
  final_amount_cents integer NOT NULL,
  referral_code_used text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  order_status text DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  stripe_payment_intent_id text,
  wompi_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_tenant_student
  ON peskids.store_orders (tenant_slug, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_orders_status
  ON peskids.store_orders (tenant_slug, payment_status, order_status);

CREATE INDEX IF NOT EXISTS idx_store_orders_referral
  ON peskids.store_orders (tenant_slug, referral_code_used);

-- Order Items (what products were in each order)
CREATE TABLE IF NOT EXISTS peskids.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES peskids.store_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES peskids.store_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order
  ON peskids.store_order_items (order_id);

-- Enable RLS
ALTER TABLE peskids.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.store_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.store_order_items ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
DROP POLICY IF EXISTS "service_role_all_store_products" ON peskids.store_products;
CREATE POLICY "service_role_all_store_products"
  ON peskids.store_products
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_store_cart" ON peskids.store_cart_items;
CREATE POLICY "service_role_all_store_cart"
  ON peskids.store_cart_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_store_orders" ON peskids.store_orders;
CREATE POLICY "service_role_all_store_orders"
  ON peskids.store_orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_store_order_items" ON peskids.store_order_items;
CREATE POLICY "service_role_all_store_order_items"
  ON peskids.store_order_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.store_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.store_cart_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.store_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.store_order_items TO service_role;

COMMIT;
