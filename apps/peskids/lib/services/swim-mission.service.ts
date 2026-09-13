import { emitEvent } from '@/lib/events';
import { supabaseServerUntypedSchema } from '@/lib/supabase';
import {
  PESKIDS_SWIM_TENANT_ID,
  type CreateSwimMissionAssignmentInput,
  type SwimMissionActor,
} from '@/lib/swim-missions';

type SwimMissionRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  skill: string;
  safety_level: 'dry_land_safe' | 'human_review_required';
  active: boolean;
  version: number;
};

export type SwimMissionAssignmentRow = {
  id: string;
  student_id: string;
  mission_id: string;
  status: 'assigned' | 'completed' | 'cancelled' | 'expired';
  assigned_by_type: 'teacher' | 'support' | 'admin' | 'automation';
  assigned_by_user_id: string | null;
  assigned_by_rule_id: string | null;
  assigned_by_workflow_id: string | null;
  assignment_mode: 'manual' | 'recommend_only' | 'auto_assign_safe';
  reason: string | null;
  due_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSwimMissionCatalog(): Promise<SwimMissionRow[]> {
  const db = supabaseServerUntypedSchema();
  const { data, error } = await db
    .from('swim_missions')
    .select('id, slug, title, description, skill, safety_level, active, version')
    .eq('tenant_id', PESKIDS_SWIM_TENANT_ID)
    .eq('active', true)
    .order('slug', { ascending: true });

  if (error) throw new Error('Unable to load swim mission catalog');
  return (data ?? []) as SwimMissionRow[];
}

export async function listStudentSwimAssignments(
  studentId: string
): Promise<SwimMissionAssignmentRow[]> {
  const db = supabaseServerUntypedSchema();
  const { data, error } = await db
    .from('swim_mission_assignments')
    .select(
      'id, student_id, mission_id, status, assigned_by_type, assigned_by_user_id, assigned_by_rule_id, assigned_by_workflow_id, assignment_mode, reason, due_at, idempotency_key, created_at, updated_at'
    )
    .eq('tenant_id', PESKIDS_SWIM_TENANT_ID)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Unable to load swim mission assignments');
  return (data ?? []) as SwimMissionAssignmentRow[];
}

export async function createSwimMissionAssignment(
  input: CreateSwimMissionAssignmentInput,
  actor: SwimMissionActor
): Promise<SwimMissionAssignmentRow> {
  const db = supabaseServerUntypedSchema();

  const { data: mission, error: missionError } = await db
    .from('swim_missions')
    .select('id, slug, safety_level, active')
    .eq('tenant_id', PESKIDS_SWIM_TENANT_ID)
    .eq('slug', input.mission_slug)
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (missionError || !mission) {
    throw new Error('Swim mission not found');
  }

  if (
    actor.source === 'automation' &&
    mission.safety_level !== 'dry_land_safe'
  ) {
    throw new Error('Automation may only assign dry-land-safe missions');
  }

  const payload = {
    tenant_id: PESKIDS_SWIM_TENANT_ID,
    student_id: input.student_id,
    mission_id: mission.id,
    assigned_by_type: actor.source,
    assigned_by_user_id: actor.userId ?? null,
    assigned_by_rule_id: input.rule_id ?? null,
    assigned_by_workflow_id: input.workflow_id ?? null,
    assignment_mode: input.assignment_mode,
    reason: input.reason ?? null,
    due_at: input.due_at ?? null,
    idempotency_key: input.idempotency_key ?? null,
  };

  let query = db
    .from('swim_mission_assignments')
    .insert(payload)
    .select(
      'id, student_id, mission_id, status, assigned_by_type, assigned_by_user_id, assigned_by_rule_id, assigned_by_workflow_id, assignment_mode, reason, due_at, idempotency_key, created_at, updated_at'
    )
    .single();

  let result = await query;

  if (result.error && input.idempotency_key) {
    const existing = await db
      .from('swim_mission_assignments')
      .select(
        'id, student_id, mission_id, status, assigned_by_type, assigned_by_user_id, assigned_by_rule_id, assigned_by_workflow_id, assignment_mode, reason, due_at, idempotency_key, created_at, updated_at'
      )
      .eq('tenant_id', PESKIDS_SWIM_TENANT_ID)
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle();

    if (!existing.error && existing.data) {
      result = { data: existing.data, error: null } as typeof result;
    }
  }

  if (result.error || !result.data) {
    throw new Error('Unable to create swim mission assignment');
  }

  const assignment = result.data as SwimMissionAssignmentRow;

  await emitEvent('swim.mission.assigned', {
    assignment_id: assignment.id,
    student_id: assignment.student_id,
    mission_slug: input.mission_slug,
    assigned_by_type: assignment.assigned_by_type,
    assignment_mode: assignment.assignment_mode,
    rule_id: assignment.assigned_by_rule_id,
    workflow_id: assignment.assigned_by_workflow_id,
    reason: assignment.reason,
    due_at: assignment.due_at,
  });

  return assignment;
}
