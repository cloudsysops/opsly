import { describe, expect, it } from 'vitest';
import { buildYouTubeMetadata } from '../metadata/export.js';
import type { ContentProject } from '../domain/types.js';

const project: ContentProject = {
  id: 'p1',
  tenantId: 't1',
  channel: 'opsly-universe',
  series: 'OPSLY: The Parallel Path',
  episode: 1,
  title: 'Todo empezó con una pregunta',
  slug: 'todo-empezo-con-una-pregunta',
  goal: 'Introduce the Traveler',
  audience: 'fans',
  format: '9:16',
  status: 'approved',
  preset: 'opsly-universe',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('buildYouTubeMetadata', () => {
  it('always defaults privacyStatus to unlisted, never public', () => {
    const metadata = buildYouTubeMetadata(project);
    expect(metadata.privacyStatus).toBe('unlisted');
  });

  it('uses the project title verbatim', () => {
    expect(buildYouTubeMetadata(project).title).toBe('Todo empezó con una pregunta');
  });

  it('includes channel and series as default tags', () => {
    const metadata = buildYouTubeMetadata(project);
    expect(metadata.tags).toContain('opsly-universe');
    expect(metadata.tags).toContain('OPSLY: The Parallel Path');
  });

  it('accepts caller-supplied description and tags overrides', () => {
    const metadata = buildYouTubeMetadata(project, { description: 'custom', tags: ['a', 'b'] });
    expect(metadata.description).toBe('custom');
    expect(metadata.tags).toEqual(['a', 'b']);
  });
});
