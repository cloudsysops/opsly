import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProjectFromStory } from '../story.js';
import { saveProjectEnvelope } from '../storage.js';

async function makeBaseDir(): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-engine-story-'));
  await fs.mkdir(path.join(baseDir, 'config'), { recursive: true });
  await fs.cp(path.resolve(process.cwd(), '../../config/content-channels'), path.join(baseDir, 'config', 'content-channels'), {
    recursive: true,
  });
  await fs.writeFile(path.join(baseDir, 'scene-image.png'), 'fake image asset', 'utf8');
  return baseDir;
}

describe('content-engine story', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('creates a story project and maps assets by key', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);

    const { envelope, assetMap } = await createProjectFromStory(
      {
        project: {
          tenantId: 'intcloudsysops',
          channel: 'opsly-universe',
          series: 'parallel-path',
          title: 'Todo empezó con una pregunta',
          goal: 'education',
          audience: 'families',
          format: 'youtube_short',
        },
        assets: [
          {
            key: 'scene-1-image',
            sourcePath: 'scene-image.png',
            type: 'image',
          },
        ],
        scenes: [
          {
            id: 'scene-1',
            order: 1,
            durationMs: 2500,
            visualType: 'image',
            assetRefs: ['scene-1-image'],
            voiceover: 'Todo empezó con una pregunta.',
            caption: 'Todo empezó con una pregunta.',
            transition: 'cut',
            motion: 'zoom-in',
          },
        ],
      },
      baseDir
    );

    expect(envelope.scenes[0].assetRefs[0]).toBe(assetMap['scene-1-image'].id);
    expect(envelope.project.status).toBe('drafting');

    const savedPath = await saveProjectEnvelope(envelope, baseDir);
    expect(savedPath).toContain('project.json');
  });
});
