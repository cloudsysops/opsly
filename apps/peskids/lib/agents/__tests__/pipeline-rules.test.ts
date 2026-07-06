import { describe, it, expect, vi } from 'vitest';
import { buildPipelineRules, isWithinRenewalWindow } from '@/lib/agents/pipeline-rules';

const LEAD_ID = 'lead-uuid-1';

function mockSupabaseForRules(overrides: {
  email?: string;
  phone?: string | null;
  messageCount?: number;
  followupCompletedCount?: number;
  trialCount?: number;
  enrollmentCount?: number;
  attendanceCount?: number;
  activeStudentCount?: number;
  studentIds?: string[];
}) {
  const {
    email = 'parent@example.com',
    phone = '3001234567',
    messageCount = 0,
    followupCompletedCount = 0,
    trialCount = 0,
    enrollmentCount = 0,
    attendanceCount = 0,
    activeStudentCount = 0,
    studentIds = [],
  } = overrides;

  const headCount = (count: number) =>
    vi.fn().mockResolvedValue({ count, error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === 'leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email, phone },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: headCount(messageCount),
              }),
            }),
          }),
        };
      }
      if (table === 'followups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: headCount(followupCompletedCount),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: studentIds.map((id) => ({ id })),
                error: null,
              }),
              in: vi.fn().mockReturnValue({
                eq: headCount(activeStudentCount),
              }),
            }),
          }),
        };
      }
      if (table === 'trial_classes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: headCount(trialCount),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: headCount(enrollmentCount),
              or: headCount(attendanceCount),
            }),
          }),
        }),
      })),
    })),
  };
}

describe('pipeline-rules (local)', () => {
  it('New Lead → Contacted when inbound message exists', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ messageCount: 1 }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[0].condition(LEAD_ID)).resolves.toBe(true);
  });

  it('New Lead → Contacted when completed followup exists', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ followupCompletedCount: 1 }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[0].condition(LEAD_ID)).resolves.toBe(true);
  });

  it('New Lead → Contacted is false without local contact evidence', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ messageCount: 0, followupCompletedCount: 0 }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[0].condition(LEAD_ID)).resolves.toBe(false);
  });

  it('Contacted → Trial Class from trial_classes', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ trialCount: 1 }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[1].condition(LEAD_ID)).resolves.toBe(true);
  });

  it('Contacted → Trial Class is false without trial row', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ trialCount: 0 }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[1].condition(LEAD_ID)).resolves.toBe(false);
  });

  it('Trial Class → Enrolled with paid enrollment on linked student', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({
        studentIds: ['student-1'],
        enrollmentCount: 1,
      }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[2].condition(LEAD_ID)).resolves.toBe(true);
  });

  it('Enrolled → Active Student with local attendance', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({
        studentIds: ['student-1'],
        attendanceCount: 1,
      }) as never,
      tenantSlug: 'peskids',
    });
    await expect(rules[3].condition(LEAD_ID)).resolves.toBe(true);
  });

  describe('isWithinRenewalWindow', () => {
    it('is true within the window before month-end', () => {
      expect(isWithinRenewalWindow(new Date(2026, 0, 28))).toBe(true); // Jan 31 is month-end, 3 days out
      expect(isWithinRenewalWindow(new Date(2026, 0, 31))).toBe(true); // month-end itself
    });

    it('is false outside the window', () => {
      expect(isWithinRenewalWindow(new Date(2026, 0, 1))).toBe(false);
      expect(isWithinRenewalWindow(new Date(2026, 0, 20))).toBe(false);
    });
  });

  it('Active Student → Renewal when within window and an active student is linked', async () => {
    const withinWindow = new Date(2026, 0, 28); // 3 days before Jan 31 month-end
    const rules = buildPipelineRules(
      {
        supabase: mockSupabaseForRules({
          studentIds: ['student-1'],
          activeStudentCount: 1,
        }) as never,
        tenantSlug: 'peskids',
      },
      withinWindow
    );
    expect(rules).toHaveLength(5);
    expect(rules[4].nextStage).toBe('Renewal');
    await expect(rules[4].condition(LEAD_ID)).resolves.toBe(true);
  });

  it('Active Student → Renewal is false outside the renewal window', async () => {
    const outsideWindow = new Date(2026, 0, 10);
    const rules = buildPipelineRules(
      {
        supabase: mockSupabaseForRules({
          studentIds: ['student-1'],
          activeStudentCount: 1,
        }) as never,
        tenantSlug: 'peskids',
      },
      outsideWindow
    );
    await expect(rules[4].condition(LEAD_ID)).resolves.toBe(false);
  });

  it('Active Student → Renewal is false without a linked active student', async () => {
    const withinWindow = new Date(2026, 0, 28);
    const rules = buildPipelineRules(
      {
        supabase: mockSupabaseForRules({
          studentIds: ['student-1'],
          activeStudentCount: 0,
        }) as never,
        tenantSlug: 'peskids',
      },
      withinWindow
    );
    await expect(rules[4].condition(LEAD_ID)).resolves.toBe(false);
  });
});
