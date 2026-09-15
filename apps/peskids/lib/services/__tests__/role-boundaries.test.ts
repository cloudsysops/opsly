import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

const maybeSingle = vi.fn();
const enrollmentEq = vi.fn();
const fromMock = vi.fn();
const schemaFromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    from: (table: string) => {
      fromMock(table);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle,
            }),
          }),
        }),
      };
    },
    schema: () => ({
      from: (table: string) => {
        schemaFromMock(table);
        return {
          select: () => ({
            eq: () => ({
              eq: enrollmentEq,
            }),
          }),
        };
      },
    }),
  }),
}));

const familyUser = {
  id: 'family-1',
  email: 'parent@example.com',
} as User;

describe('role boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies a family that does not own the student', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'student-2',
        parent_email: 'other@example.com',
        family_user_id: 'family-other',
      },
      error: null,
    });

    const { studentBelongsToFamily } = await import('@/lib/services/enrollment.service');
    await expect(studentBelongsToFamily('student-2', familyUser)).resolves.toBe(false);
  });

  it('allows a family that owns the student', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'student-1',
        parent_email: 'parent@example.com',
        family_user_id: 'family-1',
      },
      error: null,
    });

    const { studentBelongsToFamily } = await import('@/lib/services/enrollment.service');
    await expect(studentBelongsToFamily('student-1', familyUser)).resolves.toBe(true);
  });

  it('denies a teacher who has not taught the student', async () => {
    enrollmentEq.mockResolvedValue({
      data: [{ classes: { professor_user_id: 'teacher-other' } }],
      error: null,
    });

    const { teacherTaughtStudent } = await import('@/lib/services/badge.service');
    await expect(teacherTaughtStudent('teacher-1', 'student-1')).resolves.toBe(false);
  });

  it('allows a teacher who taught the student', async () => {
    enrollmentEq.mockResolvedValue({
      data: [{ classes: { professor_user_id: 'teacher-1' } }],
      error: null,
    });

    const { teacherTaughtStudent } = await import('@/lib/services/badge.service');
    await expect(teacherTaughtStudent('teacher-1', 'student-1')).resolves.toBe(true);
  });
});
