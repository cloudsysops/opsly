import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const tenantRoleFromUserMetadataMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/runtime/tenant-identity', () => ({
  tenantRoleFromUserMetadata: tenantRoleFromUserMetadataMock,
}));

let lastUpdatePayload: Record<string, unknown> | undefined;

const selectMock = vi.fn(async () => ({
  data: [{ submission_id: 'sub-1', score: 90, feedback: 'Muy bien', status: 'graded' }],
  error: null,
}));

const updateEqSecondMock = vi.fn(() => ({ select: selectMock }));

const updateEqFirstMock = vi.fn(() => ({ eq: updateEqSecondMock }));

const updateMock = vi.fn((payload: Record<string, unknown>) => {
  lastUpdatePayload = payload;
  return { eq: updateEqFirstMock };
});

const fromMock = vi.fn(() => ({ update: updateMock }));
const schemaMock = vi.fn(() => ({ from: fromMock }));
const supabaseServerMock = vi.fn(() => ({ schema: schemaMock }));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

function buildRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers({ 'x-request-id': 'grade-test' }),
    json: async () => body,
  } as never;
}

function buildContext(submissionId: string) {
  return { params: Promise.resolve({ submissionId }) };
}

describe('POST /api/submissions/[submissionId]/grade', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    tenantRoleFromUserMetadataMock.mockReset();
    supabaseServerMock.mockClear();
    schemaMock.mockClear();
    fromMock.mockClear();
    updateMock.mockClear();
    updateEqFirstMock.mockClear();
    updateEqSecondMock.mockClear();
    selectMock.mockClear();
    lastUpdatePayload = undefined;
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { id: 'teacher-1' },
    });
    tenantRoleFromUserMetadataMock.mockReturnValue('teacher');
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST(buildRequest({ score: 90 }), buildContext('sub-1'));

    expect(response.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('forbids roles other than teacher/admin', async () => {
    tenantRoleFromUserMetadataMock.mockReturnValue('parent');
    const { POST } = await import('../route');

    const response = await POST(buildRequest({ score: 90 }), buildContext('sub-1'));

    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects a score above 100', async () => {
    const { POST } = await import('../route');

    const response = await POST(buildRequest({ score: 150 }), buildContext('sub-1'));

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('queries the peskids schema and marks the submission graded', async () => {
    const { POST } = await import('../route');

    await POST(buildRequest({ score: 90, feedback: 'Muy bien' }), buildContext('sub-1'));

    expect(schemaMock).toHaveBeenCalledWith('peskids');
    expect(lastUpdatePayload?.score).toBe(90);
    expect(lastUpdatePayload?.feedback).toBe('Muy bien');
    expect(lastUpdatePayload?.status).toBe('graded');
  });

  it('returns 200 with the graded submission', async () => {
    const { POST } = await import('../route');

    const response = await POST(
      buildRequest({ score: 90, feedback: 'Muy bien' }),
      buildContext('sub-1')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.score).toBe(90);
    expect(payload.status).toBe('graded');
  });

  it('404s when the submission does not exist', async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    const { POST } = await import('../route');

    const response = await POST(buildRequest({ score: 90 }), buildContext('missing'));

    expect(response.status).toBe(404);
  });
});
