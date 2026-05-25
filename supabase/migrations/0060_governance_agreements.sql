-- governance.agreements
-- Records B2B customer acceptance of ToS / DPA per tenant.
-- Written when a tenant admin clicks "I accept" during onboarding or when ToS version updates.

create table if not exists governance.agreements (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  user_id         uuid references auth.users(id) on delete set null,
  document_id     text not null,
  document_version text not null,
  accepted_at     timestamptz not null default now(),
  ip              text,
  user_agent      text
);

alter table governance.agreements enable row level security;

create policy "service_role_all" on governance.agreements
  for all
  to service_role
  using (true)
  with check (true);

-- Tenant admins can read their tenant's agreements
create policy "tenant_read_own" on governance.agreements
  for select
  to authenticated
  using (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id'));

create index if not exists idx_agreements_tenant_id on governance.agreements (tenant_id);
create index if not exists idx_agreements_accepted_at on governance.agreements (accepted_at);
