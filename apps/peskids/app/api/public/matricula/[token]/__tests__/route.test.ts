import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENROLLMENT_LINK_UNAVAILABLE } from '@/lib/enrollment-access/token';

const resolveEnrollmentTokenMock = vi.fn();
const submitEnrollmentFormMock = vi.fn();

vi.mock('@/lib/enrollment-access/resolve', () => ({
  resolveEnrollmentToken: resolveEnrollmentTokenMock,
}));

vi.mock('@/lib/enrollment-access/submit', () => ({
  submitEnrollmentForm: submitEnrollmentFormMock,
}));

vi.mock('@/lib/enrollment-access/store', () => ({
  supabaseEnrollmentLeadStore: {},
}));

vi.mock('@/lib/events', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('public /api/public/matricula/[token]', () => {
  beforeEach(() => {
    resolveEnrollmentTokenMock.mockReset();
    submitEnrollmentFormMock.mockReset();
  });

  it('returns a generic 404 for invalid tokens', async () => {
    resolveEnrollmentTokenMock.mockResolvedValue({
      ok: false,
      error: ENROLLMENT_LINK_UNAVAILABLE,
      reason: 'invalid',
    });
    const { GET } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-mat-404' }) } as never;
    const response = await GET(req, { params: Promise.resolve({ token: 'nope' }) });
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error).toBe(ENROLLMENT_LINK_UNAVAILABLE);
    expect(JSON.stringify(body)).not.toMatch(/lead_|student_|family_/);
  });

  it('rejects unknown fields before linking records', async () => {
    submitEnrollmentFormMock.mockResolvedValue({
      ok: false,
      error: 'Unrecognized key: lead_id',
      status: 400,
    });
    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-mat-400', 'content-type': 'application/json' }),
      json: async () => ({ lead_id: 'tampered' }),
    } as never;
    const response = await POST(req, { params: Promise.resolve({ token: 'abc' }) });
    expect(response.status).toBe(400);
  });
});
