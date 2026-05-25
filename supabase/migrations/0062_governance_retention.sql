-- governance.retention_schedule
-- Defines per-tenant, per-table TTLs for the data retention cron job.
-- The cron job (apps/api/app/api/cron/retention/route.ts) reads this table and
-- soft-deletes / hard-deletes rows that have exceeded their TTL.

create table if not exists governance.retention_schedule (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  schema_name     text not null,
  table_name      text not null,
  date_column     text not null default 'created_at',
  ttl_days        integer not null check (ttl_days > 0),
  action          text not null default 'delete' check (action in ('delete', 'anonymize', 'archive')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, schema_name, table_name)
);

alter table governance.retention_schedule enable row level security;

create policy "service_role_all" on governance.retention_schedule
  for all
  to service_role
  using (true)
  with check (true);

-- Seed with default Peskids retention rules (Ley 1581: data tied to minors, 2 years post-inactivity)
insert into governance.retention_schedule (tenant_id, schema_name, table_name, date_column, ttl_days, action)
values
  ('peskids', 'public', 'leads',     'created_at', 730, 'delete'),
  ('peskids', 'public', 'peskids_form_submissions', 'submitted_at', 730, 'delete'),
  ('peskids', 'public', 'peskids_audit_log', 'created_at', 730, 'delete'),
  ('peskids', 'governance', 'consents', 'granted_at', 1825, 'archive')
on conflict (tenant_id, schema_name, table_name) do nothing;
