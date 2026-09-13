-- NEEDS_PRODUCTION_MIGRATION_APPROVAL
-- Peskids swim home missions: canonical catalog + assignments + completions.
-- This migration is additive and does not alter existing class/progress tables.

create table if not exists public.swim_missions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'peskids',
  slug text not null,
  title text not null,
  description text not null,
  skill text not null,
  safety_level text not null default 'dry_land_safe'
    check (safety_level in ('dry_land_safe', 'human_review_required')),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug, version)
);

create table if not exists public.swim_mission_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'peskids',
  student_id uuid not null references public.students(id) on delete cascade,
  mission_id uuid not null references public.swim_missions(id) on delete restrict,
  status text not null default 'assigned'
    check (status in ('assigned', 'completed', 'cancelled', 'expired')),
  assigned_by_type text not null
    check (assigned_by_type in ('teacher', 'support', 'admin', 'automation')),
  assigned_by_user_id uuid null,
  assigned_by_rule_id text null,
  assigned_by_workflow_id text null,
  assignment_mode text not null default 'manual'
    check (assignment_mode in ('manual', 'recommend_only', 'auto_assign_safe')),
  reason text null,
  due_at timestamptz null,
  idempotency_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.swim_mission_completions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'peskids',
  assignment_id uuid not null references public.swim_mission_assignments(id) on delete cascade,
  completed_at timestamptz not null default now(),
  guardian_confirmed boolean not null default false,
  source text not null default 'game'
    check (source in ('game', 'family', 'teacher', 'support')),
  note text null,
  created_at timestamptz not null default now(),
  unique (tenant_id, assignment_id)
);

create index if not exists idx_swim_mission_assignments_student_status
  on public.swim_mission_assignments (tenant_id, student_id, status, created_at desc);

create index if not exists idx_swim_mission_assignments_due
  on public.swim_mission_assignments (tenant_id, due_at)
  where status = 'assigned';

insert into public.swim_missions (tenant_id, slug, title, description, skill, safety_level, version)
values
  ('peskids', 'bubbles-v1', 'Burbujas con Peki', 'Ritmo de exhalación suave fuera del agua. Nunca incluye apnea ni retención de aire.', 'breathing_rhythm', 'dry_land_safe', 1),
  ('peskids', 'streamline-v1', 'Flecha', 'Reconocer y practicar postura larga y alineada en seco.', 'streamline_posture', 'dry_land_safe', 1),
  ('peskids', 'kick-rhythm-v1', 'Ritmo de patada', 'Coordinación alternada izquierda/derecha sentado en una silla estable.', 'kick_coordination', 'dry_land_safe', 1)
on conflict (tenant_id, slug, version) do update
set
  title = excluded.title,
  description = excluded.description,
  skill = excluded.skill,
  safety_level = excluded.safety_level,
  active = true,
  updated_at = now();

comment on table public.swim_mission_assignments is
  'Peskids home-practice assignments. Teacher, support/admin and governed automation share this single contract.';
