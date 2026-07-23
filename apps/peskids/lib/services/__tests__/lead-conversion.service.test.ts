import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLeadForAdminMock = vi.fn();
const updateLeadForAdminMock = vi.fn();
const emitEventMock = vi.fn();
const supabaseFromMock = vi.fn();

vi.mock('@/lib/services/lead-admin.service', () => ({
  getLeadForAdmin: getLeadForAdminMock,
  updateLeadForAdmin: updateLeadForAdminMock,
}));

vi.mock('@/lib/events', () => ({
  emitEvent: emitEventMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    from: supabaseFromMock,
  }),
}));

function leadFixture() {
  return {
    id: 'lead-1',
    name: 'Ana Pérez',
    email: 'padre@example.com',
    phone: '+573001112233',
    class_modality: 'llanogrande' as const,
    neighborhood: null,
    grade_interested: '6-8',
    status: 'contacted' as const,
    admin_notes: 'Prioridad',
    referral_code: null,
    referred_by_code: null,
    referral_discount_cents: 0,
    referral_redemptions: 0,
    created_at: '2026-07-20T10:00:00.000Z',
    referral_source: 'instagram',
    twenty_opportunity_id: 'opp-1',
  };
}

describe('convertLeadToStudent', () => {
  beforeEach(() => {
    getLeadForAdminMock.mockReset();
    updateLeadForAdminMock.mockReset();
    emitEventMock.mockReset();
    supabaseFromMock.mockReset();
    emitEventMock.mockResolvedValue(undefined);
  });

  it('creates a student, marks lead enrolled and emits student.enrolled', async () => {
    getLeadForAdminMock.mockResolvedValue(leadFixture());
    updateLeadForAdminMock.mockResolvedValue({ ...leadFixture(), status: 'enrolled' });

    const sourceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const dupQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const insertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'stu-1',
          name: 'Ana Pérez',
          grade: '6-8',
          parent_email: 'padre@example.com',
          parent_phone: '+573001112233',
          enrollment_date: '2026-07-23',
          status: 'active',
          source_lead_id: 'lead-1',
        },
        error: null,
      }),
    };

    let studentsCalls = 0;
    supabaseFromMock.mockImplementation((table: string) => {
      if (table !== 'students') throw new Error(`unexpected ${table}`);
      studentsCalls += 1;
      if (studentsCalls === 1) return sourceQuery;
      if (studentsCalls === 2) return dupQuery;
      return insertQuery;
    });

    const { convertLeadToStudent } = await import('../lead-conversion.service');
    const result = await convertLeadToStudent('lead-1', 'peskids', {
      consent_confirmed: true,
      child_name: 'Ana Pérez',
      program: 'Peskids',
      enrollment_date: '2026-07-23',
    });

    expect(result?.created).toBe(true);
    expect(result?.student.id).toBe('stu-1');
    expect(updateLeadForAdminMock).toHaveBeenCalledWith('lead-1', 'peskids', {
      status: 'enrolled',
    });
    expect(emitEventMock).toHaveBeenCalledWith(
      'student.enrolled',
      expect.objectContaining({
        student_id: 'stu-1',
        lead_id: 'lead-1',
        program: 'Peskids',
      })
    );
  });

  it('returns duplicate candidates when force is false', async () => {
    getLeadForAdminMock.mockResolvedValue(leadFixture());

    const sourceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const dupQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'stu-dup',
            name: 'Ana Pérez',
            parent_email: 'padre@example.com',
            parent_phone: null,
            source_lead_id: 'other',
            status: 'active',
          },
        ],
        error: null,
      }),
    };

    let studentsCalls = 0;
    supabaseFromMock.mockImplementation(() => {
      studentsCalls += 1;
      return studentsCalls === 1 ? sourceQuery : dupQuery;
    });

    const { convertLeadToStudent, LeadConvertDuplicateError } = await import(
      '../lead-conversion.service'
    );

    await expect(
      convertLeadToStudent('lead-1', 'peskids', {
        consent_confirmed: true,
        child_name: 'Ana Pérez',
      })
    ).rejects.toBeInstanceOf(LeadConvertDuplicateError);
  });

  it('is idempotent when source_lead_id already exists', async () => {
    getLeadForAdminMock.mockResolvedValue(leadFixture());
    updateLeadForAdminMock.mockResolvedValue({ ...leadFixture(), status: 'enrolled' });

    const sourceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'stu-existing',
          name: 'Ana Pérez',
          grade: '6-8',
          parent_email: 'padre@example.com',
          parent_phone: null,
          enrollment_date: '2026-07-01',
          status: 'active',
          source_lead_id: 'lead-1',
        },
        error: null,
      }),
    };
    supabaseFromMock.mockReturnValue(sourceQuery);

    const { convertLeadToStudent } = await import('../lead-conversion.service');
    const result = await convertLeadToStudent('lead-1', 'peskids');

    expect(result?.created).toBe(false);
    expect(result?.student.id).toBe('stu-existing');
    expect(emitEventMock).toHaveBeenCalledWith(
      'student.enrolled',
      expect.objectContaining({ created: false })
    );
  });
});
