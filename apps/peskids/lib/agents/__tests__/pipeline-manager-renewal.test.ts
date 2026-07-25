import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  getGoHighLevelService: vi.fn(() => null),
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isPeskidsGhlEnabled: vi.fn(() => false),
}));

// Force the single rule under test (Active Student -> Renewal) regardless of
// real DB evidence, so this file can test the stage-advance + renewal-notify
// wiring in isolation from the students/class_enrollments query chain that
// `hasActiveStudentNearRenewal` (pipeline-rules.ts) depends on.
vi.mock('@/lib/agents/pipeline-rules', () => ({
  buildPipelineRules: vi.fn(() => [
    {
      currentStage: 'Active Student',
      nextStage: 'Renewal',
      condition: async () => true,
      description: 'test-forced',
      source: 'enrollments',
    },
  ]),
  LOCAL_STATUS_TO_PIPELINE_STAGE: {
    new: 'New Lead',
    contacted: 'Contacted',
    trial: 'Trial Class',
    enrolled: 'Enrolled',
    active: 'Active Student',
    renewal: 'Renewal',
  },
  PIPELINE_STAGE_TO_LOCAL_STATUS: {
    'New Lead': 'new',
    Contacted: 'contacted',
    'Trial Class': 'trial',
    Enrolled: 'enrolled',
    'Active Student': 'active',
    Renewal: 'renewal',
  },
}));

const createFollowupMock = vi.fn();
vi.mock('@/lib/services/followup-admin.service', () => ({
  createFollowup: createFollowupMock,
}));

const emitLeadRenewalDueMock = vi.fn();
vi.mock('@/lib/events', () => ({
  emitLeadRenewalDue: emitLeadRenewalDueMock,
}));

function makeSupabaseMock() {
  const leadRow = { id: 'lead-uuid-1', status: 'active', email: 'a@b.com', ghl_contact_id: null };

  return {
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })),
    })),
    from: vi.fn((table: string) => {
      if (table !== 'leads') return { select: vi.fn() };
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: leadRow.id, status: leadRow.status },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: leadRow.email, ghl_contact_id: leadRow.ghl_contact_id },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }),
  };
}

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(),
}));

describe('PipelineManagerService — renewal notify', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.PESKIDS_RENEWAL_REMINDER_ENABLED;
    createFollowupMock.mockResolvedValue({ id: 'fu-renewal-1' });
    emitLeadRenewalDueMock.mockResolvedValue(undefined);
    const supabaseModule = await import('@/lib/supabase');
    (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock()
    );
  });

  afterEach(() => {
    delete process.env.PESKIDS_RENEWAL_REMINDER_ENABLED;
  });

  it('advances to Renewal without creating a followup when the flag is off', async () => {
    const { PipelineManagerService } = await import('@/lib/agents/pipeline-manager.service');
    const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });

    const result = await svc.evaluateAndAdvance('lead-uuid-1');

    expect(result.advanced).toBe(true);
    expect(result.to).toBe('Renewal');
    expect(createFollowupMock).not.toHaveBeenCalled();
  });

  it('creates a lead followup (Twenty Task path) and emits lead.renewal_due when the flag is on', async () => {
    process.env.PESKIDS_RENEWAL_REMINDER_ENABLED = 'true';
    const { PipelineManagerService } = await import('@/lib/agents/pipeline-manager.service');
    const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });

    const result = await svc.evaluateAndAdvance('lead-uuid-1');

    expect(result.advanced).toBe(true);
    expect(result.to).toBe('Renewal');
    expect(createFollowupMock).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: 'lead-uuid-1', contact_type: 'lead', type: 'call' })
    );
    expect(emitLeadRenewalDueMock).toHaveBeenCalledWith({
      leadId: 'lead-uuid-1',
      followupId: 'fu-renewal-1',
    });
  });

  it('does not fail the stage advance when the followup creation throws', async () => {
    process.env.PESKIDS_RENEWAL_REMINDER_ENABLED = 'true';
    createFollowupMock.mockRejectedValue(new Error('twenty down'));
    const { PipelineManagerService } = await import('@/lib/agents/pipeline-manager.service');
    const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });

    const result = await svc.evaluateAndAdvance('lead-uuid-1');

    expect(result.advanced).toBe(true);
    expect(result.to).toBe('Renewal');
  });
});
