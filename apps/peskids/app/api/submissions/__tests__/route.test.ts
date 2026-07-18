import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateFamilyRequestMock = vi.fn();
const getParentSubmissionsMock = vi.fn();
const syncSubmissionToTwentyMock = vi.fn();

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}));

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: () => ({
    getParentSubmissions: getParentSubmissionsMock,
  }),
}));

vi.mock('@/lib/twenty-submission-sync', () => ({
  syncSubmissionToTwenty: syncSubmissionToTwentyMock,
}));

let lastFormSelectEq: Record<string, unknown> = {};
let lastSubmissionInsertPayload: Record<string, unknown> | undefined;
let lastSubmissionUpdatePayload: Record<string, unknown> | undefined;

const formMaybeSingleMock = vi.fn(async () => ({
  data: { id: 'form-uuid-1', status: 'active' } as { id: string; status: string } | null,
  error: null as { message: string } | null,
}));

const formEqMock = vi.fn((column: string, value: unknown) => {
  lastFormSelectEq[column] = value;
  return { eq: formEqMock, maybeSingle: formMaybeSingleMock };
});

const formsSelectMock = vi.fn(() => ({ eq: formEqMock }));

const submissionSingleMock = vi.fn(async () => ({
  data: {
    id: 'submission-row-1',
    submission_id: 'submission-uuid-1',
    status: 'submitted',
    completed_at: '2026-07-17T00:00:00Z',
  },
  error: null,
}));

const submissionInsertMock = vi.fn((payload: Record<string, unknown>) => {
  lastSubmissionInsertPayload = payload;
  return { select: () => ({ single: submissionSingleMock }) };
});

const submissionUpdateEqMock = vi.fn(async () => ({ error: null }));

const submissionUpdateMock = vi.fn((payload: Record<string, unknown>) => {
  lastSubmissionUpdatePayload = payload;
  return { eq: submissionUpdateEqMock };
});

const fromMock = vi.fn((table: string) => {
  if (table === 'forms') return { select: formsSelectMock };
  if (table === 'form_submissions') {
    return { insert: submissionInsertMock, update: submissionUpdateMock };
  }
  throw new Error(`Unexpected table: ${table}`);
});

const schemaMock = vi.fn(() => ({ from: fromMock }));
const supabaseServerMock = vi.fn(() => ({ schema: schemaMock }));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

function buildGetRequest() {
  return { headers: new Headers({ 'x-request-id': 'req-submissions-get' }) } as never;
}

function buildPostRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers({ 'x-request-id': 'req-submissions-post' }),
    json: async () => body,
  } as never;
}

describe('GET /api/submissions', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset();
    getParentSubmissionsMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../route');

    const response = await GET(buildGetRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-submissions-get',
    });
    expect(getParentSubmissionsMock).not.toHaveBeenCalled();
  });

  it('filters submissions using the family email from the session', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    });
    getParentSubmissionsMock.mockResolvedValue([
      { submissionId: 's1', formTitle: 'Natación', submittedAt: '2026-05-01' },
    ]);
    const { GET } = await import('../route');

    const response = await GET(buildGetRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateFamilyRequestMock).toHaveBeenCalled();
    expect(getParentSubmissionsMock).toHaveBeenCalledWith('family@example.com');
    expect(payload.submissions).toHaveLength(1);
    expect(payload.userRole).toBe('parent');
    expect(payload.request_id).toBe('req-submissions-get');
  });
});

describe('POST /api/submissions', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset();
    syncSubmissionToTwentyMock.mockReset();
    supabaseServerMock.mockClear();
    schemaMock.mockClear();
    fromMock.mockClear();
    formsSelectMock.mockClear();
    formEqMock.mockClear();
    formMaybeSingleMock.mockClear();
    submissionInsertMock.mockClear();
    submissionUpdateMock.mockClear();
    submissionUpdateEqMock.mockClear();
    lastFormSelectEq = {};
    lastSubmissionInsertPayload = undefined;
    lastSubmissionUpdatePayload = undefined;
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { id: 'family-user-1', email: 'family@example.com' },
    });
    formMaybeSingleMock.mockResolvedValue({
      data: { id: 'form-uuid-1', status: 'active' },
      error: null,
    });
    syncSubmissionToTwentyMock.mockResolvedValue(null);
  });

  it('rejects unauthenticated requests', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST(buildPostRequest({ formId: 'form-1', data: { answer: 'yes' } }));

    expect(response.status).toBe(401);
    expect(submissionInsertMock).not.toHaveBeenCalled();
  });

  it('rejects a request with no data', async () => {
    const { POST } = await import('../route');

    const response = await POST(buildPostRequest({ formId: 'form-1', data: {} }));

    expect(response.status).toBe(400);
    expect(submissionInsertMock).not.toHaveBeenCalled();
  });

  it('404s when the form does not exist or is not active', async () => {
    formMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { POST } = await import('../route');

    const response = await POST(
      buildPostRequest({ formId: 'missing-form', data: { answer: 'yes' } })
    );

    expect(response.status).toBe(404);
    expect(submissionInsertMock).not.toHaveBeenCalled();
  });

  it('stores the full form_data payload against the resolved form uuid', async () => {
    const { POST } = await import('../route');

    await POST(
      buildPostRequest({ formId: 'form-1', data: { answer: 'yes', child_name: 'Mateo' } })
    );

    expect(lastSubmissionInsertPayload?.form_id).toBe('form-uuid-1');
    expect(lastSubmissionInsertPayload?.status).toBe('submitted');
    expect(lastSubmissionInsertPayload?.user_id).toBe('family-user-1');
    expect(lastSubmissionInsertPayload?.form_data).toMatchObject({
      answer: 'yes',
      child_name: 'Mateo',
      parent_email: 'family@example.com',
    });
  });

  it('returns 201 with the created submission', async () => {
    const { POST } = await import('../route');

    const response = await POST(buildPostRequest({ formId: 'form-1', data: { answer: 'yes' } }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.submissionId).toBe('submission-uuid-1');
    expect(payload.status).toBe('submitted');
  });

  it('syncs the submission to Twenty and stores the returned person id without blocking the response', async () => {
    syncSubmissionToTwentyMock.mockResolvedValue({ twentyPersonId: 'person-1', created: true });
    const { POST } = await import('../route');

    await POST(buildPostRequest({ formId: 'form-1', data: { answer: 'yes' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(syncSubmissionToTwentyMock).toHaveBeenCalledWith(
      expect.objectContaining({ parentEmail: 'family@example.com' })
    );
    expect(lastSubmissionUpdatePayload?.twenty_person_id).toBe('person-1');
  });
});
