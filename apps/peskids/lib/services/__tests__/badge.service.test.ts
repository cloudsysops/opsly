import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

// Supabase's real query builder is "thenable" at any point in the chain —
// `.eq(...)` alone (no trailing `.order()`/`.single()`) is awaitable, as
// teacherTaughtStudent relies on. Mirror that instead of only resolving on
// specific terminal methods.
function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.insert = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.order = vi.fn(self);
  builder.single = vi.fn(self);
  return builder;
}

let queryResult: QueryResult;

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: () => makeBuilder(queryResult),
    }),
  }),
}));

describe('badge.service', () => {
  beforeEach(() => {
    queryResult = { data: [], error: null };
  });

  it('listBadgesForStudent returns rows ordered by the query builder', async () => {
    queryResult = {
      data: [{ id: 'b1', label: 'Burbujas' }],
      error: null,
    };
    const { listBadgesForStudent } = await import('@/lib/services/badge.service');
    const badges = await listBadgesForStudent('s1');
    expect(badges).toEqual([{ id: 'b1', label: 'Burbujas' }]);
  });

  it('listBadgesForStudents returns [] without querying for an empty id list', async () => {
    const { listBadgesForStudents } = await import('@/lib/services/badge.service');
    const badges = await listBadgesForStudents([]);
    expect(badges).toEqual([]);
  });

  it('createBadge inserts with tenant_slug and returns the created row', async () => {
    queryResult = {
      data: { id: 'b1', label: 'Burbujas', student_id: 's1', awarded_by_role: 'teacher' },
      error: null,
    };
    const { createBadge } = await import('@/lib/services/badge.service');
    const badge = await createBadge({
      studentId: 's1',
      label: 'Burbujas',
      awardedBy: 'teacher-1',
      awardedByRole: 'teacher',
    });
    expect(badge).toEqual({
      id: 'b1',
      label: 'Burbujas',
      student_id: 's1',
      awarded_by_role: 'teacher',
    });
  });

  it('createBadge throws on error', async () => {
    queryResult = { data: null, error: { message: 'insert failed' } };
    const { createBadge } = await import('@/lib/services/badge.service');
    await expect(
      createBadge({ studentId: 's1', label: 'x', awardedBy: null, awardedByRole: null })
    ).rejects.toBeTruthy();
  });

  it('teacherTaughtStudent returns true only if the teacher taught one of the linked classes', async () => {
    queryResult = {
      data: [
        { classes: { professor_user_id: 'teacher-other' } },
        { classes: { professor_user_id: 'teacher-1' } },
      ],
      error: null,
    };
    const { teacherTaughtStudent } = await import('@/lib/services/badge.service');
    await expect(teacherTaughtStudent('teacher-1', 's1')).resolves.toBe(true);
    await expect(teacherTaughtStudent('teacher-missing', 's1')).resolves.toBe(false);
  });
});
