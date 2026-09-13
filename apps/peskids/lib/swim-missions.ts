import { z } from 'zod';

export const PESKIDS_SWIM_TENANT_ID = 'peskids' as const;

export const SWIM_MISSION_ASSIGNMENT_SOURCES = [
  'teacher',
  'support',
  'admin',
  'automation',
] as const;

export const SWIM_MISSION_ASSIGNMENT_MODES = [
  'manual',
  'recommend_only',
  'auto_assign_safe',
] as const;

export const SWIM_MISSION_STATUSES = [
  'assigned',
  'completed',
  'cancelled',
  'expired',
] as const;

export type SwimMissionAssignmentSource =
  (typeof SWIM_MISSION_ASSIGNMENT_SOURCES)[number];
export type SwimMissionAssignmentMode =
  (typeof SWIM_MISSION_ASSIGNMENT_MODES)[number];
export type SwimMissionStatus = (typeof SWIM_MISSION_STATUSES)[number];

export const createSwimMissionAssignmentSchema = z
  .object({
    student_id: z.string().uuid(),
    mission_slug: z.string().trim().min(1).max(120),
    reason: z.string().trim().max(500).optional().nullable(),
    due_at: z.string().datetime({ offset: true }).optional().nullable(),
    assignment_mode: z.enum(SWIM_MISSION_ASSIGNMENT_MODES).default('manual'),
    rule_id: z.string().trim().max(160).optional().nullable(),
    workflow_id: z.string().trim().max(160).optional().nullable(),
    idempotency_key: z.string().trim().min(1).max(200).optional().nullable(),
  })
  .strict();

export type CreateSwimMissionAssignmentInput = z.infer<
  typeof createSwimMissionAssignmentSchema
>;

export type SwimMissionActor = {
  source: SwimMissionAssignmentSource;
  userId?: string | null;
};

export function assignmentSourceForStaffRole(
  role: string | null | undefined
): SwimMissionAssignmentSource | null {
  switch ((role ?? '').trim().toLowerCase()) {
    case 'teacher':
      return 'teacher';
    case 'support':
      return 'support';
    case 'owner':
    case 'admin':
      return 'admin';
    default:
      return null;
  }
}

export function automationInputIsGoverned(
  input: CreateSwimMissionAssignmentInput
): boolean {
  if (input.assignment_mode !== 'auto_assign_safe') return false;
  return Boolean(input.rule_id && input.workflow_id && input.idempotency_key);
}
