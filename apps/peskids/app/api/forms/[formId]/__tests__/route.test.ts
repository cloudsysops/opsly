import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateFamilyRequestMock = vi.fn();
const getActiveFamilyFormMock = vi.fn();

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}));

vi.mock('@/lib/services/family-form.service', () => ({
  getActiveFamilyForm: getActiveFamilyFormMock,
}));

function buildRequest() {
  return {
    headers: new Headers({ 'x-request-id': 'family-form-test' }),
  } as never;
}

function buildContext(formId: string) {
  return { params: Promise.resolve({ formId }) };
}

describe('GET /api/forms/[formId]', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset().mockResolvedValue({
      ok: true,
      user: { id: 'family-1' },
    });
    getActiveFamilyFormMock.mockReset();
  });

  it('requires an authenticated family', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });
    const { GET } = await import('../route');

    const response = await GET(buildRequest(), buildContext('form-1'));

    expect(response.status).toBe(401);
    expect(getActiveFamilyFormMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an inactive or missing form', async () => {
    getActiveFamilyFormMock.mockResolvedValue(null);
    const { GET } = await import('../route');

    const response = await GET(buildRequest(), buildContext('form-1'));

    expect(response.status).toBe(404);
  });

  it('returns the requested active form', async () => {
    const form = {
      id: 'form-1',
      tenantSlug: 'peskids',
      title: 'Diagnóstico',
      fields: [],
      settings: { requiresAuth: true },
      status: 'published',
      createdAt: '',
      updatedAt: '',
    };
    getActiveFamilyFormMock.mockResolvedValue(form);
    const { GET } = await import('../route');

    const response = await GET(buildRequest(), buildContext('form-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getActiveFamilyFormMock).toHaveBeenCalledWith('peskids', 'form-1');
    expect(payload.form).toEqual(form);
  });
});
