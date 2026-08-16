import { describe, expect, it } from 'vitest';
import {
  canTransitionContentProjectStatus,
  contentProjectStatusPath,
  transitionContentProjectStatus,
} from '../workflow.js';

describe('content-engine workflow', () => {
  it('exposes allowed transition paths', () => {
    expect(contentProjectStatusPath().idea).toContain('drafting');
    expect(contentProjectStatusPath().ready_to_render).toContain('rendering');
  });

  it('accepts valid transitions', () => {
    expect(canTransitionContentProjectStatus('drafting', 'assets_pending')).toBe(true);
    expect(transitionContentProjectStatus('drafting', 'assets_pending')).toBe('assets_pending');
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionContentProjectStatus('published', 'drafting')).toThrow(
      'Invalid content project transition: published -> drafting'
    );
  });
});
