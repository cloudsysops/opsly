-- governance.breach_log
-- Security incident / personal data breach registry.
-- Required fields per:
--   - Ley 1581 art. 17(g) + Circular Externa SIC 002/2015: notify SIC + titulares
--   - GDPR art. 33: notify supervisory authority within 72h of awareness
-- Status flow: detected → assessed → notified_authority → notified_subjects → closed

create table if not exists governance.breach_log (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            text not null,
  title                text not null,
  description          text not null,
  discovered_at        timestamptz not null,
  reported_at          timestamptz not null default now(),
  status               text not null default 'detected' check (
    status in ('detected', 'assessed', 'notified_authority', 'notified_subjects', 'closed')
  ),
  severity             text not null check (severity in ('low', 'medium', 'high', 'critical')),
  affected_data_types  text[] not null default '{}',
  affected_subject_count integer,
  root_cause           text,
  containment_actions  text,
  authority_notified_at timestamptz,
  authority_reference  text,
  subjects_notified_at timestamptz,
  notification_method  text,
  closed_at            timestamptz,
  lessons_learned      text,
  reported_by          uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table governance.breach_log enable row level security;

create policy "service_role_all" on governance.breach_log
  for all
  to service_role
  using (true)
  with check (true);

-- Only platform admins can read breach log (handled via app_metadata role check)
create policy "admin_read" on governance.breach_log
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin');

create index if not exists idx_breach_log_tenant_id on governance.breach_log (tenant_id);
create index if not exists idx_breach_log_status on governance.breach_log (status) where status != 'closed';
create index if not exists idx_breach_log_discovered_at on governance.breach_log (discovered_at);
