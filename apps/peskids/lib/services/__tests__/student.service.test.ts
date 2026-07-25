import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.or = vi.fn(self);
  builder.ilike = vi.fn(self);
  builder.order = vi.fn(self);
  return builder;
}

let primaryResult: QueryResult;
let fallbackResult: QueryResult;
let callCount = 0;

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    from: () => {
      callCount += 1;
      // First call in a test is the primary query; a second call (only
      // reached on the family_user_id-error fallback path) uses fallbackResult.
      return makeBuilder(callCount === 1 ? primaryResult : fallbackResult);
    },
  }),
}));

describe('listFamilyStudents', () => {
  beforeEach(() => {
    callCount = 0;
    primaryResult = { data: [], error: null };
    fallbackResult = { data: [], error: null };
  });

  it('returns students matched by family_user_id or parent_email', async () => {
    primaryResult = {
      data: [{ id: 's1', name: 'Ana', grade: '3', status: 'active' }],
      error: null,
    };

    const { listFamilyStudents } = await import('@/lib/services/student.service');
    const students = await listFamilyStudents({ id: 'fam-1', email: 'parent@example.com' });

    expect(students).toEqual([{ id: 's1', name: 'Ana', grade: '3', status: 'active' }]);
  });

  it('falls back to a parent_email-only query when family_user_id errors', async () => {
    primaryResult = { data: null, error: { message: 'column family_user_id does not exist' } };
    fallbackResult = {
      data: [{ id: 's2', name: 'Leo', grade: '5', status: 'active' }],
      error: null,
    };

    const { listFamilyStudents } = await import('@/lib/services/student.service');
    const students = await listFamilyStudents({ id: 'fam-1', email: 'parent@example.com' });

    expect(students).toEqual([{ id: 's2', name: 'Leo', grade: '5', status: 'active' }]);
  });

  it('throws for unrelated errors', async () => {
    primaryResult = { data: null, error: { message: 'connection refused' } };

    const { listFamilyStudents } = await import('@/lib/services/student.service');
    await expect(listFamilyStudents({ id: 'fam-1', email: null })).rejects.toBeTruthy();
  });
});
