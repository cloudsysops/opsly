import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidStageTransition } from '../icso-pipeline-stages';
import { IcsoPipelineService } from '../icso-pipeline.service';

describe('icso pipeline stages', () => {
  it('allows prospecting to qualification', () => {
    expect(isValidStageTransition('prospecting', 'qualification')).toBe(true);
  });

  it('blocks won deals from moving', () => {
    expect(isValidStageTransition('won', 'lost')).toBe(false);
  });
});

describe('IcsoPipelineService.advanceDealStage', () => {
  it('updates stage when transition is valid', async () => {
    const updateTerminal = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { stage: 'prospecting' },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: updateTerminal,
          }),
        }),
      })),
    } as unknown as SupabaseClient;

    const service = new IcsoPipelineService(client);
    const result = await service.advanceDealStage('deal-1', 'qualification');

    expect(result.advanced).toBe(true);
    expect(result.currentStage).toBe('qualification');
    expect(updateTerminal).toHaveBeenCalled();
  });
});
