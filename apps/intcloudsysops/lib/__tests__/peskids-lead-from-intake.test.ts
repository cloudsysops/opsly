import { beforeEach, describe, expect, it, vi } from 'vitest';

const postPeskidsLeadWithGHLMock = vi.fn();

vi.mock('@/lib/peskids-canonical-api', () => ({
  postPeskidsLeadWithGHL: postPeskidsLeadWithGHLMock,
}));

describe('submitLeadFromIntake', () => {
  beforeEach(() => {
    postPeskidsLeadWithGHLMock.mockReset();
  });

  it('returns false when required intake fields are missing', async () => {
    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');

    await expect(
      submitLeadFromIntake({
        parentName: 'Ana',
        email: 'ana@example.com',
      })
    ).resolves.toEqual({ ok: false });
    expect(postPeskidsLeadWithGHLMock).not.toHaveBeenCalled();
  });

  it('uses the canonical lead API for complete intake profiles', async () => {
    postPeskidsLeadWithGHLMock.mockResolvedValue({
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
    });

    expect(result).toEqual({ ok: true });
    expect(postPeskidsLeadWithGHLMock).toHaveBeenCalledWith(
      {
        name: 'Ana Restrepo',
        email: 'ana@example.com',
        phone: '3001234567',
        class_modality: 'llanogrande',
        neighborhood: 'Llanogrande',
        grade_interested: '6-8',
        referral_source: 'whatsapp',
      },
      expect.any(String)
    );
  });

  it('returns false when canonical API rejects the lead', async () => {
    postPeskidsLeadWithGHLMock.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'Lead service unavailable',
    });

    const { submitLeadFromIntake } = await import('../peskids-lead-from-intake');
    const result = await submitLeadFromIntake({
      parentName: 'Ana Restrepo',
      email: 'ana@example.com',
      classModality: 'llanogrande',
      neighborhood: 'Llanogrande',
      gradeInterested: '6-8',
    });

    expect(result).toEqual({ ok: false });
  });
});
