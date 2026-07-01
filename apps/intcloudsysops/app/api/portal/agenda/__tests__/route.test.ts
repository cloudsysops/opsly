import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateFamilyRequestMock = vi.fn();
const listFamilyAgendaMock = vi.fn();

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}));

vi.mock('@/lib/services/agenda.service', () => ({
  listFamilyAgenda: listFamilyAgendaMock,
}));

describe('GET /api/portal/agenda', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset();
    listFamilyAgendaMock.mockReset();
  });

  it('returns 401 when auth fails', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const { GET } = await import('../route');
    const req = {
      nextUrl: new URL('https://peskids.op-sly.com/api/portal/agenda'),
      headers: new Headers(),
    } as never;

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('returns family agenda payload', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { id: 'family-1' },
    });
    listFamilyAgendaMock.mockResolvedValue([{ id: 'agenda-1' }]);

    const { GET } = await import('../route');
    const req = {
      nextUrl: new URL('https://peskids.op-sly.com/api/portal/agenda'),
      headers: new Headers(),
    } as never;

    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(listFamilyAgendaMock).toHaveBeenCalledWith(
      expect.objectContaining({ familyUserId: 'family-1' })
    );
  });
});
