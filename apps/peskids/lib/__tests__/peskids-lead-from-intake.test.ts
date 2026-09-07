import { beforeEach, describe, expect, it, vi } from 'vitest';

const postPeskidsLeadWithCRMMock = vi.fn();

vi.mock('@/lib/peskids-canonical-api', () => ({
  postPeskidsLeadWithCRM: postPeskidsLeadWithCRMMock,
}));

describe('submitLeadFromIntake', () => {
  beforeEach(() => {
    postPeskidsLeadWithCRMMock.mockReset();
  });

  it('returns false when required intake fields are missing', async () => {
    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');

    await expect(
      submitLeadFromIntake({
        parentName: 'Ana',
        email: 'ana@example.com',
      })
    ).resolves.toMatchObject({ ok: false });
    expect(postPeskidsLeadWithCRMMock).not.toHaveBeenCalled();
  });

  it('uses the canonical lead API for complete intake profiles', async () => {
    postPeskidsLeadWithCRMMock.mockResolvedValue({
      ok: true,
      leadId: 'lead-intake-1',
      tenantSlug: 'peskids',
      createdAt: '2026-06-09T12:00:00.000Z',
    });

    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');
    const result = await submitLeadFromIntake({
      parentName: 'Ana Restrepo',
      email: 'ana@example.com',
      phone: '3001234567',
      classModality: 'llanogrande',
      neighborhood: 'Llanogrande',
      gradeInterested: '6-8',
      referralSource: 'whatsapp',
      consentTreatment: 'yes',
    });

    expect(result).toEqual({ ok: true, leadId: 'lead-intake-1' });
    expect(postPeskidsLeadWithCRMMock).toHaveBeenCalledWith(
      {
        name: 'Ana Restrepo',
        email: 'ana@example.com',
        phone: '3001234567',
        lead_type: 'family',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
        grade_interested: '6-8',
        child_name: undefined,
        company_name: undefined,
        referral_source: 'whatsapp',
        metadata: {
          intake_channel: 'web_chat',
          applicant_role: 'family',
          consent_treatment: true,
          special_condition: null,
          special_condition_details: null,
          teacher_preference: null,
          child_age: null,
        },
      },
      expect.any(String)
    );
  });

  it('returns false when canonical API rejects the lead', async () => {
    postPeskidsLeadWithCRMMock.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'Lead service unavailable',
    });

    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');
    const result = await submitLeadFromIntake({
      parentName: 'Ana Restrepo',
      email: 'ana@example.com',
      phone: '3001234567',
      classModality: 'llanogrande',
      neighborhood: 'Llanogrande',
      gradeInterested: '6-8',
      consentTreatment: 'yes',
    });

    expect(result).toMatchObject({ ok: false });
  });

  it('returns false without phone or consent', async () => {
    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');
    await expect(
      submitLeadFromIntake({
        parentName: 'Ana Restrepo',
        email: 'ana@example.com',
        classModality: 'llanogrande',
        neighborhood: 'Llanogrande',
        gradeInterested: '6-8',
      })
    ).resolves.toMatchObject({ ok: false });
  });

  it('saves teacher_applicant with short chat profile', async () => {
    postPeskidsLeadWithCRMMock.mockResolvedValue({
      ok: true,
      leadId: 'lead-teacher-1',
      tenantSlug: 'peskids',
      createdAt: '2026-06-09T12:00:00.000Z',
    });

    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');
    const result = await submitLeadFromIntake({
      applicantRole: 'teacher_applicant',
      parentName: 'Carlos Pérez',
      email: 'carlos@example.com',
      phone: '3009998877',
      consentTreatment: 'yes',
    });

    expect(result).toEqual({ ok: true, leadId: 'lead-teacher-1' });
    expect(postPeskidsLeadWithCRMMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_type: 'teacher_applicant',
        class_modality: 'llanogrande',
        grade_interested: 'Other',
      }),
      expect.any(String)
    );
  });
});
