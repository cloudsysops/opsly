import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const platformFromMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: () => platformFromMock(),
    }),
  }),
}));

describe('GET /api/leads/[id]', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    platformFromMock.mockReset();
  });

  it('does not return lead PII without staff auth', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const { GET } = await import('../route');
    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-lead-get-401' }) } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(401);
    expect(platformFromMock).not.toHaveBeenCalled();
  });

  it('returns lead fields for staff', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    platformFromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'lead-1',
                full_name: 'Ana',
                email: 'ana@example.com',
                phone: '+57300',
                lead_type: 'family',
                grade_interested: 'K-5',
                class_modality: 'llanogrande',
                company_name: null,
                company_nit: null,
                metadata: null,
                child_name: 'Luna',
                neighborhood: 'Llanogrande',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { GET } = await import('../route');
    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-lead-get-200' }) } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { email: string } };
    expect(body.data.email).toBe('ana@example.com');
  });
});
