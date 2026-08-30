import { describe, expect, it } from 'vitest';
import { CONTENT_PROJECT_TRANSITIONS } from '../domain/types.js';
import { buildProjectId, newAssetId, newRenderJobId, newSceneId, slugify } from '../domain/ids.js';

describe('slugify', () => {
  it('lowercases, strips accents, and hyphenates', () => {
    expect(slugify('Todo empezó con una pregunta')).toBe('todo-empezo-con-una-pregunta');
  });

  it('strips leading/trailing hyphens and collapses runs', () => {
    expect(slugify('  --Hello   World!!--  ')).toBe('hello-world');
  });

  it('caps length at 60 chars', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });
});

describe('buildProjectId', () => {
  it('zero-pads the sequence number to 3 digits', () => {
    expect(buildProjectId('parallel-path', 1)).toBe('parallel-path-001');
    expect(buildProjectId('parallel-path', 42)).toBe('parallel-path-042');
  });
});

describe('id generators', () => {
  it('produce unique, prefixed ids', () => {
    expect(newAssetId()).toMatch(/^asset_/);
    expect(newRenderJobId()).toMatch(/^render_/);
    expect(newSceneId(3)).toBe('scene_03');
    expect(newAssetId()).not.toBe(newAssetId());
  });
});

describe('CONTENT_PROJECT_TRANSITIONS', () => {
  it('allows the full happy path idea -> ... -> published', () => {
    expect(CONTENT_PROJECT_TRANSITIONS.idea).toContain('drafting');
    expect(CONTENT_PROJECT_TRANSITIONS.drafting).toContain('assets_pending');
    expect(CONTENT_PROJECT_TRANSITIONS.assets_pending).toContain('ready_to_render');
    expect(CONTENT_PROJECT_TRANSITIONS.ready_to_render).toContain('rendering');
    expect(CONTENT_PROJECT_TRANSITIONS.rendering).toContain('ready_for_review');
    expect(CONTENT_PROJECT_TRANSITIONS.ready_for_review).toContain('approved');
    expect(CONTENT_PROJECT_TRANSITIONS.approved).toContain('published');
  });

  it('does not allow published to go backwards to drafting', () => {
    expect(CONTENT_PROJECT_TRANSITIONS.published).not.toContain('drafting');
  });

  it('archived is terminal (no outgoing transitions)', () => {
    expect(CONTENT_PROJECT_TRANSITIONS.archived).toEqual([]);
  });

  it('failed can only go back to assets_pending or archived', () => {
    expect(CONTENT_PROJECT_TRANSITIONS.failed.sort()).toEqual(['archived', 'assets_pending']);
  });
});
