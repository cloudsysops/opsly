import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const fireSubmissionEventMock = vi.fn();

let lastUpdatePayload: Record<string, unknown> | undefined;

const eqMock = vi.fn();
const inMock = vi.fn();
const selectMock = vi.fn(async () => ({
  data: [{ submission_id: 's1' }],
  error: null,
}));

const updateMock = vi.fn((payload: Record<string, unknown>) => {
  lastUpdatePayload = payload;
  return { eq: eqMock };
});

eqMock.mockImplementation(() => ({ in: inMock }));
inMock.mockImplementation(() => ({ select: selectMock }));

const rpcMock = vi.fn(async () => ({ error: null }));
const fromMock = vi.fn(() => ({ update: updateMock }));
const schemaMock = vi.fn(() => ({ from: fromMock, rpc: rpcMock }));
const supabaseServerMock = vi.fn(() => ({ schema: schemaMock, rpc: rpcMock }));

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock('@/lib/n8n-submission-events', () => ({
  fireSubmissionEvent: fireSubmissionEventMock,
}));

function buildRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers({ 'x-request-id': 'bulk-grade-test' }),
    json: async () => body,
  } as never;
}

describe('POST /api/submissions/bulk-grade', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    supabaseServerMock.mockClear();
    schemaMock.mockClear();
    fromMock.mockClear();
    updateMock.mockClear();
    fireSubmissionEventMock.mockReset();
    lastUpdatePayload = undefined;
    validateStaffRequestMock.mockResolvedValue({ ok: true, user: { id: 'staff-1' } });
  });

  it('queries the peskids schema, not public', async () => {
    const { POST } = await import('../route');

    await POST(buildRequest({ submissionIds: ['s1'], action: 'mark_reviewed' }));

    expect(schemaMock).toHaveBeenCalledWith('peskids');
  });

  it('reassigns to a valid status accepted by the peskids.form_submissions CHECK constraint', async () => {
    const { POST } = await import('../route');

    await POST(buildRequest({ submissionIds: ['s1'], action: 'reassign' }));

    expect(['started', 'submitted', 'reviewed', 'graded']).toContain(lastUpdatePayload?.status);
  });
});
