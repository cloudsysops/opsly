-- Fix RLS on public.messages: Supabase service_role must bypass custom app.settings checks.

DROP POLICY IF EXISTS "Service role can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Service role can read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can read messages for their tenant" ON public.messages;

CREATE POLICY "service_role_all_messages"
  ON public.messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_messages_by_tenant"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (tenant_id = COALESCE(current_setting('app.settings.tenant_id', true), ''));

GRANT ALL ON public.messages TO service_role;
