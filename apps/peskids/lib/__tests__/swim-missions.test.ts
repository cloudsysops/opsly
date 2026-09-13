import { describe, expect, it } from 'vitest';
import {
  assignmentSourceForStaffRole,
  automationInputIsGoverned,
  createSwimMissionAssignmentSchema,
} from '@/lib/swim-missions';

describe('swim mission assignment contract', () => {
  it('maps teacher and support roles to auditable assignment sources', () => {
    expect(assignmentSourceForStaffRole('teacher')).toBe('teacher');
    expect(assignmentSourceForStaffRole('support')).toBe('support');
    expect(assignmentSourceForStaffRole('admin')).toBe('admin');
    expect(assignmentSourceForStaffRole('owner')).toBe('admin');
    expect(assignmentSourceForStaffRole('family')).toBeNull();
  });

  it('requires governed automation metadata', () => {
    const parsed = createSwimMissionAssignmentSchema.parse({
      student_id: '11111111-1111-4111-8111-111111111111',
      mission_slug: 'bubbles-v1',
      assignment_mode: 'auto_assign_safe',
      rule_id: 'after-class-bubbles',
      workflow_id: 'peskids-swim-mission-assign',
      idempotency_key: 'class:abc:student:123:mission:bubbles-v1',
    });

    expect(automationInputIsGoverned(parsed)).toBe(true);
  });

  it('rejects manual payloads as automation', () => {
    const parsed = createSwimMissionAssignmentSchema.parse({
      student_id: '11111111-1111-4111-8111-111111111111',
      mission_slug: 'streamline-v1',
    });

    expect(automationInputIsGoverned(parsed)).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(
      createSwimMissionAssignmentSchema.safeParse({
        student_id: '11111111-1111-4111-8111-111111111111',
        mission_slug: 'bubbles-v1',
        assigned_by_type: 'automation',
      }).success
    ).toBe(false);
  });
});
