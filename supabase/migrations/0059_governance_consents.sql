-- governance.consents
-- Audit trail for every consent event: parental treatment, marketing, AI chat, cookie acceptance.
-- Written by backend at form submit / cookie banner / chat open.
-- RLS: service_role writes; authenticated users read only their own records (for DSAR).

create schema if not exists governance;

create table if not exists governance.consents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  subject_email   text,
  policy_id       text not null,
  policy_version  text not null,
  consent_type    text not null check (
    consent_type in ('treatment', 'marketing', 'parental', 'ai_chat', 'cookie')
  ),
  granted_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  ip              text,
  user_agent      text,
  payload_hash    text,
  metadata        jsonb
);

-- RLS
alter table governance.consents enable row level security;

-- service_role can do everything (used by API routes)
create policy "service_role_all" on governance.consents
  for all
  to service_role
  using (true)
  with check (true);

-- authenticated users can read consents where their email matches (for DSAR self-service)
create policy "subject_read_own" on governance.consents
  for select
  to authenticated
  using (subject_email = auth.jwt() ->> 'email');

-- Indexes for DSAR lookups and cleanup jobs
create index if not exists idx_consents_subject_email on governance.consents (subject_email);
create index if not exists idx_consents_tenant_id on governance.consents (tenant_id);
create index if not exists idx_consents_granted_at on governance.consents (granted_at);
create index if not exists idx_consents_revoked_at on governance.consents (revoked_at) where revoked_at is not null;
