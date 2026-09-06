import { describe, expect, it } from 'vitest';
import {
  buildLeadPipelineProgress,
  LEAD_PIPELINE_STAGES,
  LEAD_STATUS_LABEL,
  leadStatusTone,
} from '@/lib/admin/lead-pipeline-progress';

describe('lead-pipeline-progress', () => {
  it('marks stages done/current/upcoming for contacted leads', () => {
    const progress = buildLeadPipelineProgress('contacted');
    expect(progress.archived).toBe(false);
    expect(progress.currentIndex).toBe(1);
    expect(progress.states).toEqual(['done', 'current', 'upcoming', 'upcoming']);
    expect(progress.stages).toHaveLength(LEAD_PIPELINE_STAGES.length);
  });

  it('places enrollment before the first class', () => {
    expect(buildLeadPipelineProgress('enrolled').states).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
    ]);
    expect(buildLeadPipelineProgress('active').currentIndex).toBe(2);
    expect(buildLeadPipelineProgress('trial').states).toEqual([
      'done',
      'done',
      'done',
      'current',
    ]);
  });

  it('flags archived leads as skipped', () => {
    const progress = buildLeadPipelineProgress('archived');
    expect(progress.archived).toBe(true);
    expect(progress.states.every((s) => s === 'skipped')).toBe(true);
  });

  it('exposes Spanish labels and tones', () => {
    expect(LEAD_STATUS_LABEL.new).toMatch(/Nuevo/i);
    expect(LEAD_PIPELINE_STAGES[3].label).toBe('Primera clase');
    expect(leadStatusTone('new')).toBe('coral');
    expect(leadStatusTone('enrolled')).toBe('green');
  });
});
