import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const convertLeadToStudentMock = vi.fn();

class LeadConvertDuplicateError extends Error {
  readonly code = 'duplicate_candidates';
  readonly duplicates: Array<{
    id: string;
    name: string;
    parent_email: string | null;
    parent_phone: string | null;
    source_lead_id: string | null;
    status: 'active' | 'inactive';
  }>;

  constructor(
    duplicates: Array<{
      id: string;
      name: string;
      parent_email: string | null;
      parent_phone: string | null;
      source_lead_id: string | null;
      status: 'active' | 'inactive';
    }>
  ) {
    super('Possible duplicate students found');
    this.name = 'LeadConvertDuplicateError';
    this.duplicates = duplicates;
  }
}

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/lead-conversion.service', () => ({
  convertLeadToStudent: convertLeadToStudentMock,
  LeadConvertDuplicateError,
  LeadConvertValidationError: class LeadConvertValidationError extends Error {
    readonly code = 'validation_error';
  },
}));

function adminUser() {
  return { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} };
}

function supportUser() {
  return { user_metadata: { role: 'support', tenant_slug: 'peskids' }, app_metadata: {} };
}

describe('POST /api/admin/leads/[id]/convert', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    convertLeadToStudentMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { POST } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-convert-401' }) } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });

    expect(response.status).toBe(401);
    expect(convertLeadToStudentMock).not.toHaveBeenCalled();
  });

  it('rejects non-admin staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: supportUser(),
    });

    const { POST } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-convert-403' }) } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });

    expect(response.status).toBe(403);
    expect(convertLeadToStudentMock).not.toHaveBeenCalled();
  });

  it('returns 404 when lead is missing', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    convertLeadToStudentMock.mockResolvedValue(null);

    const { POST } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-convert-404' }) } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(response.status).toBe(404);
  });

  it('converts a lead for admin users', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    convertLeadToStudentMock.mockResolvedValue({
      student: { id: 's1', name: 'Ana', grade: '3', status: 'active' },
      lead: { id: 'lead-1', status: 'enrolled', name: 'Ana', email: 'a@test.com' },
      created: true,
    });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-convert-201' }),
    } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.student.id).toBe('s1');
    expect(convertLeadToStudentMock).toHaveBeenCalledWith('lead-1', 'peskids', {});
  });

  it('returns 409 with duplicate candidates', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    convertLeadToStudentMock.mockRejectedValue(
      new LeadConvertDuplicateError([
        {
          id: 's-dup',
          name: 'Ana',
          parent_email: 'a@test.com',
          parent_phone: null,
          source_lead_id: 'other',
          status: 'active',
        },
      ])
    );

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({
        'x-request-id': 'req-convert-409',
        'content-type': 'application/json',
      }),
      json: async () => ({ consent_confirmed: true, child_name: 'Ana' }),
    } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe('duplicate_candidates');
    expect(json.duplicates).toHaveLength(1);
  });
});