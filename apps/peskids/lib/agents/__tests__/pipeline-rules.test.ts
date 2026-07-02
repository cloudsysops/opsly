import { describe, it, expect, vi } from 'vitest';
import { buildPipelineRules } from '@/lib/agents/pipeline-rules';
import type { LeadPipelineContext } from '@/lib/agents/pipeline-rules';

function mockSupabaseForRules(overrides: {
  messageCount?: number;
  trialCount?: number;
  enrollmentCount?: number;
  attendanceCount?: number;
  studentIds?: string[];
}) {
  const {
    messageCount = 0,
    trialCount = 0,
    enrollmentCount = 0,
    attendanceCount = 0,
    studentIds = [],
  } = overrides;

  const headCount = (count: number) =>
    vi.fn().mockResolvedValue({ count, error: null });

  return {
    from: vi.fn((table: string) => {
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
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: studentIds.map((id) => ({ id })),
                error: null,
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

const lead: LeadPipelineContext = {
  leadId: 'lead-uuid-1',
  email: 'parent@example.com',
  phone: '3001234567',
  ghlContactId: null,
};

describe('pipeline-rules (local)', () => {
  it('New Lead → Contacted when inbound message exists', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ messageCount: 1 }) as never,
      tenantSlug: 'peskids',
    });
    const rule = rules[0];
    await expect(rule.condition(lead)).resolves.toBe(true);
  });

  it('Contacted → Trial when trial_classes row exists', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({ trialCount: 1 }) as never,
      tenantSlug: 'peskids',
    });
    const rule = rules[1];
    await expect(rule.condition(lead)).resolves.toBe(true);
  });

  it('Trial → Enrolled when linked student has paid enrollment', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({
        studentIds: ['student-1'],
        enrollmentCount: 1,
      }) as never,
      tenantSlug: 'peskids',
    });
    const rule = rules[2];
    await expect(rule.condition(lead)).resolves.toBe(true);
  });

  it('Enrolled → Active when attendance recorded', async () => {
    const rules = buildPipelineRules({
      supabase: mockSupabaseForRules({
        studentIds: ['student-1'],
        attendanceCount: 1,
      }) as never,
      tenantSlug: 'peskids',
    });
    const rule = rules[3];
    await expect(rule.condition(lead)).resolves.toBe(true);
  });
});
