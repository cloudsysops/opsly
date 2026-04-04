-- platform.subscriptions is created in 0002_tenants_table.sql; add query helpers for billing/webhooks.
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON platform.subscriptions (tenant_id);