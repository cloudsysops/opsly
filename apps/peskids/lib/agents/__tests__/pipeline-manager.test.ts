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

type LeadRow = {
  id: string;
  email: string;
  phone: string | null;
  ghl_contact_id: string | null;
  status: string;
};

function createSupabaseMock(options: {
  lead?: LeadRow | null;
  leadsList?: Array<{ id: string; status: string }>;
  leadsListError?: Error;
  messageCount?: number;
  followupCompletedCount?: number;
}) {
  const lead = options.lead ?? null;
  const leadsList = options.leadsList ?? [];
  const messageCount = options.messageCount ?? 0;
  const followupCompletedCount = options.followupCompletedCount ?? 0;

  const headCount = (count: number) =>
    vi.fn().mockResolvedValue({ count, error: null });

  const leadsMaybeSingle = vi.fn().mockImplementation(({ dataShape }: { dataShape?: string }) => {
    if (!lead) {
      return Promise.resolve({ data: null, error: null });
    }
    if (dataShape === 'status-only') {
      return Promise.resolve({ data: { status: lead.status }, error: null });
    }
    if (dataShape === 'id-status') {
      return Promise.resolve({ data: { id: lead.id, status: lead.status }, error: null });
    }
    if (dataShape === 'update') {
      return Promise.resolve({
        data: { email: lead.email, ghl_contact_id: lead.ghl_contact_id },
        error: null,
      });
    }
    return Promise.resolve({
      data: {
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        ghl_contact_id: lead.ghl_contact_id,
        status: lead.status,
      },
      error: null,
    });
  });

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
      if (table === 'leads') {
        const leadQueryTail = {
          maybeSingle: () => leadsMaybeSingle({ dataShape: 'id-status' }),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: leadsList,
            error: options.leadsListError
              ? { message: options.leadsListError.message }
              : null,
          }),
        };

        return {
          select: vi.fn((columns?: string) => {
            if (columns === 'status') {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: () => leadsMaybeSingle({ dataShape: 'status-only' }),
                  }),
                }),
              };
            }
            if (columns === 'email, phone') {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: lead
                          ? { email: lead.email, phone: lead.phone }
                          : null,
                        error: null,
                      }),
                  }),
                }),
              };
            }
            if (columns === 'id') {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: lead ? { id: lead.id } : null,
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue(leadQueryTail),
                neq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: leadsList,
                      error: options.leadsListError
                        ? { message: options.leadsListError.message }
                        : null,
                    }),
                  }),
                }),
              }),
            };
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: () => leadsMaybeSingle({ dataShape: 'update' }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
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
  });

  describe('buildPipelineRules', () => {
    it('builds 4 local rules without GHL calendar dependency', async () => {
      const { buildPipelineRules } = await import('@/lib/agents/pipeline-rules');
      const rules = buildPipelineRules({
        supabase: {} as RuleServices['supabase'],
        tenantSlug: 'peskids',
      });

      expect(rules).toHaveLength(4);
      expect(rules[1].source).toBe('trial_classes');
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
    it('advances using lead.id without ghl_contact_id when local evidence exists', async () => {
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
          messageCount: 1,
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.evaluateAndAdvance('lead-uuid-1');
      expect(result.advanced).toBe(true);
      expect(result.from).toBe('New Lead');
      expect(result.to).toBe('Contacted');
    });

    it('does not advance when local evidence is missing', async () => {
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
          messageCount: 0,
          followupCompletedCount: 0,
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.evaluateAndAdvance('lead-uuid-1');
      expect(result.advanced).toBe(false);
      expect(result.error).toBeUndefined();
    });

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

  describe('evaluateAndAdvanceByGhlContactId (legacy adapter)', () => {
    it('resolves lead.id and delegates to evaluateAndAdvance', async () => {
      const supabaseModule = await import('@/lib/supabase');
      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue(
        createSupabaseMock({
          lead: {
            id: 'lead-uuid-1',
            email: 'parent@example.com',
            phone: '3001234567',
            ghl_contact_id: 'ghl-legacy-1',
            status: 'new',
          },
          messageCount: 1,
        })
      );

      const svc = new PipelineManagerService({ tenantSlug: 'peskids', ghlSyncEnabled: false });
      const result = await svc.evaluateAndAdvanceByGhlContactId('ghl-legacy-1');
      expect(result.advanced).toBe(true);
      expect(result.to).toBe('Contacted');
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
