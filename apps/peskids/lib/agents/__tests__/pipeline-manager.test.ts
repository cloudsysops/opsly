import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineManagerService } from '@/lib/agents/pipeline-manager.service';
import type { RuleServices } from '@/lib/agents/pipeline-rules';

vi.mock('@intcloudsysops/services/gohighlevel', () => ({
  getGoHighLevelService: vi.fn(() => ({
    getContacts: vi.fn(),
    getAppointments: vi.fn(),
    updateOpportunityStage: vi.fn(),
  })),
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isPeskidsGhlEnabled: vi.fn(() => false),
}));

function createSupabaseMock(options: {
  lead?: {
    id: string;
    email: string;
    phone: string | null;
    ghl_contact_id: string | null;
    status: string;
  } | null;
  leadsList?: Array<{ id: string; status: string }>;
  leadsListError?: Error;
}) {
  const lead = options.lead ?? null;
  const leadsList = options.leadsList ?? [];

  const leadsMaybeSingle = vi.fn().mockResolvedValue({
    data: lead
      ? {
          id: lead.id,
          email: lead.email,
          phone: lead.phone,
          ghl_contact_id: lead.ghl_contact_id,
          status: lead.status,
        }
      : null,
    error: null,
  });

  const statusMaybeSingle = vi.fn().mockResolvedValue({
    data: lead ? { status: lead.status } : null,
    error: null,
  });

  const listQueryChain = {
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: leadsList,
      error: options.leadsListError
        ? { message: options.leadsListError.message }
        : null,
    }),
  };

  const singleLeadSelectChain = {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: leadsMaybeSingle,
      }),
    }),
  };

  const statusSelectChain = {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: statusMaybeSingle,
      }),
    }),
  };

  let leadsSelectMode: 'list' | 'single' | 'status' = 'single';

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
      if (table !== 'leads') {
        return { select: vi.fn() };
      }

      return {
        select: vi.fn((columns?: string) => {
          if (columns === 'id, status') {
            leadsSelectMode = 'list';
            return listQueryChain;
          }
          if (columns === 'status') {
            leadsSelectMode = 'status';
            return statusSelectChain;
          }
          leadsSelectMode = 'single';
          return singleLeadSelectChain;
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }),
    __leadsSelectMode: () => leadsSelectMode,
  };
}

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(),
}));

describe('PipelineManagerService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('@/lib/supabase');
    (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
      createSupabaseMock({
        lead: {
          id: 'lead-uuid-1',
          email: 'parent@example.com',
          phone: '3001234567',
          ghl_contact_id: null,
          status: 'new',
        },
      })
    );
    new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
  });

  describe('static constants', () => {
    it('has 6 pipeline stages', () => {
      expect(PipelineManagerService.PIPELINE_STAGES).toEqual([
        'New Lead',
        'Contacted',
        'Trial Class',
        'Enrolled',
        'Active Student',
        'Renewal',
      ]);
    });

    it('maps every stage to a GHL stage ID (legacy sync)', () => {
      for (const stage of PipelineManagerService.PIPELINE_STAGES) {
        expect(PipelineManagerService.PESKIDS_TO_GHL_STAGE[stage]).toBeDefined();
        expect(
          PipelineManagerService.PESKIDS_TO_GHL_STAGE[stage].length
        ).toBeGreaterThan(20);
      }
    });
  });

  describe('buildPipelineRules', () => {
    it('builds 4 rules covering the full pipeline', async () => {
      const { buildPipelineRules } = await import('@/lib/agents/pipeline-rules');
      const rules = buildPipelineRules({
        supabase: {} as RuleServices['supabase'],
        tenantSlug: 'peskids',
      });

      expect(rules).toHaveLength(4);
      expect(rules[0]).toMatchObject({
        currentStage: 'New Lead',
        nextStage: 'Contacted',
        source: 'messages',
      });
      expect(rules[1]).toMatchObject({
        currentStage: 'Contacted',
        nextStage: 'Trial Class',
        source: 'trial_classes',
      });
      expect(rules[2]).toMatchObject({
        currentStage: 'Trial Class',
        nextStage: 'Enrolled',
        source: 'enrollments',
      });
      expect(rules[3]).toMatchObject({
        currentStage: 'Enrolled',
        nextStage: 'Active Student',
        source: 'attendance',
      });
    });
  });

  describe('getCurrentStage', () => {
    it('maps public.leads.status to pipeline stage', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({
          lead: {
            id: 'lead-uuid-1',
            email: 'a@b.com',
            phone: null,
            ghl_contact_id: null,
            status: 'trial',
          },
        })
      );
      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      await expect(svc.getCurrentStage('lead-uuid-1')).resolves.toBe('Trial Class');
    });
  });

  describe('evaluateAndAdvance', () => {
    it('does not advance when lead is at renewal (terminal stage)', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({
          lead: {
            id: 'lead-uuid-1',
            email: 'parent@example.com',
            phone: null,
            ghl_contact_id: null,
            status: 'renewal',
          },
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.evaluateAndAdvance('lead-uuid-1');
      expect(result.advanced).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('returns error when lead is not found', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({ lead: null })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.evaluateAndAdvance('missing-lead');
      expect(result.advanced).toBe(false);
      expect(result.error).toContain('Lead not found');
    });
  });

  describe('executePipelineCycle', () => {
    it('returns evaluated 0 when no local leads', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({ lead: null, leadsList: [] })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.executePipelineCycle();
      expect(result.evaluated).toBe(0);
      expect(result.advanced).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.details).toEqual([]);
    });

    it('evaluates local leads without calling GHL getContacts', async () => {
      const { getGoHighLevelService } = await import('@intcloudsysops/services/gohighlevel');
      const ghl = getGoHighLevelService() as unknown as {
        getContacts: ReturnType<typeof vi.fn>;
      };
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({
          lead: {
            id: 'lead-uuid-1',
            email: 'parent@example.com',
            phone: null,
            ghl_contact_id: null,
            status: 'renewal',
          },
          leadsList: [{ id: 'lead-uuid-1', status: 'renewal' }],
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.executePipelineCycle();
      expect(result.evaluated).toBe(1);
      expect(ghl.getContacts).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('wraps cycle-level errors from Supabase', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({
          lead: null,
          leadsList: [],
          leadsListError: new Error('DB unavailable'),
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      await expect(svc.executePipelineCycle()).rejects.toThrow(
        'Pipeline cycle failed: DB unavailable'
      );
    });
  });
});
