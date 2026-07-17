import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLeadForAdminMock = vi.fn();
const getStudentByIdMock = vi.fn();
const sendNotificationMock = vi.fn();
const createTwentyTaskForLeadFollowupMock = vi.fn();
const syncTwentyTaskStatusMock = vi.fn();

vi.mock('@/lib/services/lead-admin.service', () => ({
  getLeadForAdmin: getLeadForAdminMock,
}));

vi.mock('@/lib/services/student.service', () => ({
  getStudentById: getStudentByIdMock,
}));

vi.mock('@/lib/notifications', () => ({
  sendNotification: sendNotificationMock,
}));

vi.mock('@/lib/twenty-followup-sync', () => ({
  createTwentyTaskForLeadFollowup: createTwentyTaskForLeadFollowupMock,
  syncTwentyTaskStatus: syncTwentyTaskStatusMock,
}));

interface FollowupFixture {
  id: string;
  tenant_id: string;
  contact_id: string;
  contact_type: 'lead' | 'student' | 'parent';
  type: 'call' | 'email' | 'sms' | 'in-person';
  due_date: string;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  twenty_task_id: string | null;
}

function makeFollowup(overrides: Partial<FollowupFixture> & { id: string }): FollowupFixture {
  return {
    id: overrides.id,
    tenant_id: 'peskids',
    contact_id: overrides.contact_id ?? 'contact-1',
    contact_type: overrides.contact_type ?? 'lead',
    type: overrides.type ?? 'call',
    due_date: overrides.due_date ?? '2020-01-01',
    notes: overrides.notes ?? null,
    status: overrides.status ?? 'pending',
    twenty_task_id: overrides.twenty_task_id ?? null,
  };
}

let rows: FollowupFixture[] = [];

function createQueryBuilder() {
  const filters: Array<{ field: string; value: unknown }> = [];
  let mode: 'select' | 'update' = 'select';
  let updatePatch: Partial<FollowupFixture> = {};
  let wantsSingle = false;

  const lte: Array<{ field: string; value: unknown }> = [];

  const matches = () =>
    rows
      .filter((row) =>
        filters.every((f) => (row as unknown as Record<string, unknown>)[f.field] === f.value)
      )
      .filter((row) =>
        lte.every(
          (f) =>
            ((row as unknown as Record<string, unknown>)[f.field] as string) <= (f.value as string)
        )
      );

  const builder = {
    select() {
      return builder;
    },
    update(patch: Partial<FollowupFixture>) {
      mode = 'update';
      updatePatch = patch;
      return builder;
    },
    eq(field: string, value: unknown) {
      filters.push({ field, value });
      return builder;
    },
    lte(field: string, value: unknown) {
      lte.push({ field, value });
      return builder;
    },
    order() {
      return builder;
    },
    maybeSingle() {
      wantsSingle = true;
      return builder;
    },
    single() {
      wantsSingle = true;
      return builder;
    },
    then(onFulfilled: (v: { data: unknown; error: null }) => unknown) {
      const matched = matches();
      if (mode === 'update') {
        matched.forEach((row) => Object.assign(row, updatePatch));
      }
      const data = wantsSingle ? (matched[0] ?? null) : matched;
      return Promise.resolve(onFulfilled({ data, error: null }));
    },
  };

  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn(() => createQueryBuilder()),
  })),
}));

describe('executeDueFollowups', () => {
  beforeEach(() => {
    rows = [];
    getLeadForAdminMock.mockReset();
    getStudentByIdMock.mockReset();
    sendNotificationMock.mockReset().mockResolvedValue(undefined);
    createTwentyTaskForLeadFollowupMock.mockReset().mockResolvedValue(null);
    syncTwentyTaskStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('notifies and completes a due lead followup', async () => {
    rows.push(makeFollowup({ id: 'f1', contact_type: 'lead', contact_id: 'lead-1' }));
    getLeadForAdminMock.mockResolvedValue({
      id: 'lead-1',
      name: 'Ana',
      email: 'ana@example.com',
      phone: null,
    });

    const { executeDueFollowups } = await import('../followup-admin.service');
    const result = await executeDueFollowups();

    expect(result.executed).toEqual(['f1']);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'followup_due',
        recipientEmail: 'ana@example.com',
        recipientPhone: undefined,
      })
    );
    expect(rows[0].status).toBe('completed');
  });

  it('skips a followup whose contact has no email or phone', async () => {
    rows.push(makeFollowup({ id: 'f2', contact_type: 'lead', contact_id: 'lead-2' }));
    getLeadForAdminMock.mockResolvedValue({
      id: 'lead-2',
      name: 'Sin contacto',
      email: null,
      phone: null,
    });

    const { executeDueFollowups } = await import('../followup-admin.service');
    const result = await executeDueFollowups();

    expect(result.executed).toEqual([]);
    expect(result.skipped).toEqual([{ id: 'f2', reason: 'no contact channel' }]);
    expect(sendNotificationMock).not.toHaveBeenCalled();
    expect(rows[0].status).toBe('pending');
  });

  it('ignores followups that are not yet due', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    rows.push(makeFollowup({ id: 'f3', contact_type: 'lead', due_date: future }));

    const { executeDueFollowups } = await import('../followup-admin.service');
    const result = await executeDueFollowups();

    expect(result.executed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(getLeadForAdminMock).not.toHaveBeenCalled();
  });

  it('records a per-followup failure without stopping the batch', async () => {
    rows.push(makeFollowup({ id: 'f4', contact_type: 'lead', contact_id: 'lead-4' }));
    rows.push(makeFollowup({ id: 'f5', contact_type: 'lead', contact_id: 'lead-5' }));

    getLeadForAdminMock.mockImplementation(async (leadId: string) => {
      if (leadId === 'lead-4') throw new Error('lookup failed');
      return { id: leadId, name: 'Ok', email: 'ok@example.com', phone: null };
    });

    const { executeDueFollowups } = await import('../followup-admin.service');
    const result = await executeDueFollowups();

    expect(result.failed).toEqual([{ id: 'f4', error: 'lookup failed' }]);
    expect(result.executed).toEqual(['f5']);
  });

  it('skips parent contact type (no lookup implemented yet)', async () => {
    rows.push(makeFollowup({ id: 'f6', contact_type: 'parent', contact_id: 'parent-1' }));

    const { executeDueFollowups } = await import('../followup-admin.service');
    const result = await executeDueFollowups();

    expect(result.skipped).toEqual([{ id: 'f6', reason: 'no contact channel' }]);
    expect(getLeadForAdminMock).not.toHaveBeenCalled();
    expect(getStudentByIdMock).not.toHaveBeenCalled();
  });
});
