-- governance.dsar_requests
-- Data Subject / Titular Access Request tracking.
-- SLA: 15 business days (Ley 1581 art. 14) for Peskids; 45 calendar days (CCPA) for Opsly.
-- sla_deadline is computed on insert by the API; stored for querying overdue requests.

create table if not exists governance.dsar_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  subject_email   text not null,
  request_type    text not null check (
    request_type in ('access', 'rectify', 'delete', 'object', 'portability')
  ),
  status          text not null default 'received' check (
    status in ('received', 'verified', 'in_progress', 'fulfilled', 'rejected')
  ),
  created_at      timestamptz not null default now(),
  sla_deadline    timestamptz not null,
  fulfilled_at    timestamptz,
  rejected_at     timestamptz,
  rejection_reason text,
  evidence_url    text,
  verification_token text unique,
  verified_at     timestamptz,
  notes           text
);

alter table governance.dsar_requests enable row level security;

create policy "service_role_all" on governance.dsar_requests
  for all
  to service_role
  using (true)
  with check (true);

-- Subject can read their own requests after verification (via token flow, handled in API)
create policy "subject_read_own" on governance.dsar_requests
  for select
  to authenticated
  using (subject_email = auth.jwt() ->> 'email');

create index if not exists idx_dsar_subject_email on governance.dsar_requests (subject_email);
create index if not exists idx_dsar_status on governance.dsar_requests (status) where status not in ('fulfilled', 'rejected');
create index if not exists idx_dsar_sla_deadline on governance.dsar_requests (sla_deadline) where status not in ('fulfilled', 'rejected');
create index if not exists idx_dsar_tenant_id on governance.dsar_requests (tenant_id);
