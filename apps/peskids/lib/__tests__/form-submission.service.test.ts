import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const notMock = vi.fn(() => ({ order: orderMock }));
const eqChain = { eq: vi.fn(), not: notMock, order: orderMock };
eqChain.eq.mockImplementation(() => eqChain);
const selectMock = vi.fn(() => eqChain);
const fromMock = vi.fn(() => ({ select: selectMock }));
const schemaMock = vi.fn(() => ({ from: fromMock }));
const supabaseServerMock = vi.fn(() => ({ schema: schemaMock }));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

describe('FormSubmissionService', () => {
  beforeEach(() => {
    supabaseServerMock.mockClear();
    schemaMock.mockClear();
    fromMock.mockClear();
    selectMock.mockClear();
    eqChain.eq.mockClear();
    notMock.mockClear();
    orderMock.mockReset();
  });

  it('queries the peskids schema, not public', async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    const { createFormSubmissionService } = await import('../services/form-submission.service');
    const service = createFormSubmissionService();
    await service.getParentSubmissions('family@example.com');

    expect(supabaseServerMock).toHaveBeenCalledTimes(1);
    expect(schemaMock).toHaveBeenCalledWith('peskids');
  });

  it('filters parent submissions by the family email', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          submission_id: 's1',
          completed_at: '2026-05-01T12:00:00Z',
          status: 'submitted',
          form_id: 'f1',
          form: { title: 'Natación 1' },
          form_data: {
            parent_email: 'family@example.com',
            student_name: 'Mateo',
          },
        },
      ],
      error: null,
    });

    const { createFormSubmissionService } = await import('../services/form-submission.service');
    const service = createFormSubmissionService();
    const submissions = await service.getParentSubmissions(' family@example.com ');

    expect(supabaseServerMock).toHaveBeenCalledTimes(1);
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.submissionId).toBe('s1');
    expect(submissions[0]?.studentName).toBe('Mateo');
  });

  it('returns no submissions when the family email is missing', async () => {
    const { createFormSubmissionService } = await import('../services/form-submission.service');
    const service = createFormSubmissionService();
    const submissions = await service.getParentSubmissions('');

    expect(submissions).toEqual([]);
    expect(supabaseServerMock).not.toHaveBeenCalled();
  });
});
