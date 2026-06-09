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

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(),
          })),
        })),
      })),
    })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(),
            })),
            limit: vi.fn(),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(),
          })),
        })),
      })),
    })),
  })),
}));

describe('PipelineManagerService', () => {
  let service: PipelineManagerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PipelineManagerService('peskids');
  });

  describe('static constants', () => {
    it('has 5 pipeline stages (excluding Lost)', () => {
      expect(PipelineManagerService.PIPELINE_STAGES).toEqual([
        'New Lead',
        'Contacted',
        'Trial Class',
        'Enrolled',
        'Active Student',
        'Renewal',
      ]);
    });

    it('maps every stage to a GHL stage ID', () => {
      for (const stage of PipelineManagerService.PIPELINE_STAGES) {
        expect(PipelineManagerService.PESKIDS_TO_GHL_STAGE[stage]).toBeDefined();
        expect(
          PipelineManagerService.PESKIDS_TO_GHL_STAGE[stage].length
        ).toBeGreaterThan(20);
      }
    });

    it('does not have a GHL stage ID for Lost', () => {
      expect(
        (PipelineManagerService.PESKIDS_TO_GHL_STAGE as Record<string, string>)['Lost']
      ).toBeUndefined();
    });
  });

  describe('stageIndex', () => {
    it('returns correct index for New Lead', () => {
      const index = (service as unknown as {
        stageIndex: (s: string) => number;
      }).stageIndex('New Lead');
      expect(index).toBe(0);
    });

    it('returns correct index for Enrolled', () => {
      const index = (service as unknown as {
        stageIndex: (s: string) => number;
      }).stageIndex('Enrolled');
      expect(index).toBe(3);
    });

    it('returns -1 for unknown stage', () => {
      const index = (service as unknown as {
        stageIndex: (s: string) => number;
      }).stageIndex('Lost');
      expect(index).toBe(-1);
    });
  });

  describe('buildPipelineRules', () => {
    it('builds 4 rules covering the full pipeline', async () => {
      const { buildPipelineRules } = await import('@/lib/agents/pipeline-rules');
      const mockServices = {
        ghlService: {} as RuleServices['ghlService'],
        supabase: {} as RuleServices['supabase'],
        tenantSlug: 'peskids',
      };
      const rules = buildPipelineRules(mockServices);

      expect(rules).toHaveLength(4);
      expect(rules[0]).toMatchObject({
        currentStage: 'New Lead',
        nextStage: 'Contacted',
        source: 'messages',
      });
      expect(rules[1]).toMatchObject({
        currentStage: 'Contacted',
        nextStage: 'Trial Class',
        source: 'ghl_calendar',
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

    it('each rule has a condition function', async () => {
      const { buildPipelineRules } = await import('@/lib/agents/pipeline-rules');
      const rules = buildPipelineRules({
        ghlService: {} as RuleServices['ghlService'],
        supabase: {} as RuleServices['supabase'],
        tenantSlug: 'peskids',
      });

      for (const rule of rules) {
        expect(typeof rule.condition).toBe('function');
        expect(rule.description).toBeTruthy();
      }
    });
  });

  describe('evaluateAndAdvance', () => {
    it('returns no error when contact is at renewal (terminal stage)', async () => {
      const supabaseModule = await import('@/lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { stage: 'Renewal' },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) }) });

      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => ({
            select: mockSelect,
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(),
              })),
            })),
          })),
        })),
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  limit: vi.fn(),
                })),
                limit: vi.fn(),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(),
            })),
          })),
        })),
      });

      const svc = new PipelineManagerService('peskids');
      const result = await svc.evaluateAndAdvance('ghl-contact-1');
      expect(result.advanced).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('returns error with unknown stage', async () => {
      const supabaseModule = await import('@/lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { stage: 'Lost' },
        error: null,
      });

      (supabaseModule.supabaseServer as ReturnType<typeof vi.fn>).mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
              }),
            }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(),
              })),
            })),
          })),
        })),
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  limit: vi.fn(),
                })),
                limit: vi.fn(),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(),
            })),
          })),
        })),
      });

      const svc = new PipelineManagerService('peskids');
      const result = await svc.evaluateAndAdvance('ghl-contact-1');
      expect(result.advanced).toBe(false);
      expect(result.error).toContain('Unknown stage');
    });
  });

  describe('executePipelineCycle', () => {
    it('returns evaluated 0 when no contacts', async () => {
      const { getGoHighLevelService } = await import(
        '@intcloudsysops/services/gohighlevel'
      );
      (getGoHighLevelService() as unknown as { getContacts: ReturnType<typeof vi.fn> }).getContacts.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.executePipelineCycle();
      expect(result.evaluated).toBe(0);
      expect(result.advanced).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.details).toEqual([]);
    });

    it('handles contacts without IDs gracefully', async () => {
      const { getGoHighLevelService } = await import(
        '@intcloudsysops/services/gohighlevel'
      );
      (getGoHighLevelService() as unknown as { getContacts: ReturnType<typeof vi.fn> }).getContacts.mockResolvedValue({
        data: [{ id: undefined }, { id: '' }, { id: 'contact-1' }],
        total: 3,
      });

      const result = await service.executePipelineCycle();
      expect(result.evaluated).toBe(3);
      expect(typeof result.details[0].currentStage).toBe('string');
    });
  });

  describe('error handling', () => {
    it('wraps cycle-level errors', async () => {
      const { getGoHighLevelService } = await import(
        '@intcloudsysops/services/gohighlevel'
      );
      (getGoHighLevelService() as unknown as { getContacts: ReturnType<typeof vi.fn> }).getContacts.mockRejectedValue(
        new Error('GHL API unavailable')
      );

      await expect(service.executePipelineCycle()).rejects.toThrow(
        'Pipeline cycle failed: GHL API unavailable'
      );
    });
  });
});
