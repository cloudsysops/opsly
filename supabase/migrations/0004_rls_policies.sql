ALTER TABLE platform.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.port_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON platform.tenants USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON platform.subscriptions USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON platform.audit_log USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON platform.port_allocations USING (auth.role() = 'service_role');