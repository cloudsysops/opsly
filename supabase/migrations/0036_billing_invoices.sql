-- Phase 3a.1: Billing — invoices, line items, customers
-- Enables tenants to invoice their own end-customers

-- ─── Customers ───────────────────────────────────────────────
CREATE TABLE platform.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,

  email text NOT NULL,
  name text,
  company_name text,

  billing_address jsonb,

  stripe_customer_id text,

  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'archived')
  ),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_customers_tenant ON platform.customers (tenant_id);
CREATE INDEX idx_customers_stripe ON platform.customers (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ─── Invoices ────────────────────────────────────────────────
CREATE TABLE platform.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,

  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES platform.customers (id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  customer_name text,

  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void')
  ),

  subtotal_cents bigint NOT NULL DEFAULT 0,
  tax_rate_percent numeric(5, 2) NOT NULL DEFAULT 0,
  tax_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,

  currency text NOT NULL DEFAULT 'COP',

  issue_date date,
  due_date date,
  paid_date date,

  stripe_invoice_id text,

  notes text,

  pdf_storage_path text,

  metadata jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_tenant ON platform.invoices (tenant_id);
CREATE INDEX idx_invoices_tenant_status ON platform.invoices (tenant_id, status);
CREATE INDEX idx_invoices_customer ON platform.invoices (customer_id)
  WHERE customer_id IS NOT NULL;
CREATE INDEX idx_invoices_due_date ON platform.invoices (due_date)
  WHERE status IN ('sent', 'overdue');

-- ─── Line Items ──────────────────────────────────────────────
CREATE TABLE platform.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES platform.invoices (id) ON DELETE CASCADE,

  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  total_cents bigint NOT NULL,

  category text,

  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_invoice ON platform.invoice_line_items (invoice_id);

-- ─── Invoice number sequence per tenant ──────────────────────
CREATE SEQUENCE platform.invoice_number_seq START 1;

-- ─── Auto-update timestamps ──────────────────────────────────
CREATE OR REPLACE FUNCTION platform.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON platform.customers
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON platform.invoices
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE platform.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON platform.customers
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.invoices
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.invoice_line_items
  USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.invoice_line_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE platform.invoice_number_seq TO service_role;
