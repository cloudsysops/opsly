import { describe, expect, it } from 'vitest';
import { buildContentMetadata } from '../metadata.js';

describe('content-engine metadata', () => {
  it('exports unlisted youtube metadata', () => {
    const metadata = buildContentMetadata({
      schemaVersion: 1,
      project: {
        id: 'opsly-origins-001',
        tenantId: 'intcloudsysops',
        channel: 'opsly-universe',
        series: 'OPSLY: The Parallel Path',
        episode: 'opsly-origins-001',
        title: 'Todo empezó con una pregunta',
        slug: 'todo-empezo-con-una-pregunta',
        goal: 'education',
        audience: 'families',
        format: 'youtube_short',
        status: 'idea',
        preset: 'opsly-universe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      scenes: [],
      assets: [],
      renderJobs: [],
    });

    expect(metadata.privacyStatus).toBe('unlisted');
    expect(metadata.title).toBe('Todo empezó con una pregunta');
    expect(metadata.tags).toContain('opsly-universe');
  });
});
