import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProjectEnvelope, writeAssetFromSource } from '../storage.js';
import { validateContentProject } from '../validation.js';

async function makeBaseDir(): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-engine-validation-'));
  await fs.mkdir(path.join(baseDir, 'config'), { recursive: true });
  await fs.cp(path.resolve(process.cwd(), '../../config/content-channels'), path.join(baseDir, 'config', 'content-channels'), {
    recursive: true,
  });
  await fs.writeFile(path.join(baseDir, 'scene-image.png'), 'not-a-real-png-but-present', 'utf8');
  return baseDir;
}

describe('content-engine validation', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('rejects a project without scenes', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);
    const envelope = await createProjectEnvelope(
      {
        tenantId: 'intcloudsysops',
        channel: 'splashitos',
        series: 'safety',
        title: 'Water safety basics',
        goal: 'education',
        audience: 'parents',
        format: 'youtube_short',
      },
      baseDir
    );

    const result = await validateContentProject(envelope, baseDir);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain('SCENES_EMPTY');
  });

  it('accepts a complete project with local assets', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);
    const envelope = await createProjectEnvelope(
      {
        tenantId: 'intcloudsysops',
        channel: 'opsly-universe',
        series: 'parallel-path',
        title: 'Todo empezó con una pregunta',
        goal: 'education',
        audience: 'families',
        format: 'youtube_short',
      },
      baseDir
    );

    const asset = await writeAssetFromSource({
      tenantId: 'intcloudsysops',
      projectId: envelope.project.id,
      sourcePath: 'scene-image.png',
      type: 'image',
      baseDir,
    });
    envelope.assets.push(asset);
    envelope.scenes.push({
      id: 'scene-1',
      projectId: envelope.project.id,
      order: 1,
      durationMs: 2500,
      visualType: 'image',
      assetRefs: [asset.id],
      voiceover: 'Todo empezó con una pregunta.',
      caption: 'Todo empezó con una pregunta.',
      transition: 'cut',
      motion: 'zoom-in',
    });

    const result = await validateContentProject(envelope, baseDir);
    expect(result.valid).toBe(true);
    expect(result.summary.scenes).toBe(1);
    expect(result.summary.assets).toBe(1);
    expect(result.summary.readyToRender).toBe(true);
  });
});
