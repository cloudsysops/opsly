import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadContentChannelPreset, loadAllContentChannelPresets, contentChannelPresetDefaults } from '../presets.js';

async function makeBaseDir(): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-engine-presets-'));
  await fs.mkdir(path.join(baseDir, 'config'), { recursive: true });
  await fs.cp(path.resolve(process.cwd(), '../../config/content-channels'), path.join(baseDir, 'config', 'content-channels'), {
    recursive: true,
  });
  return baseDir;
}

describe('content-engine presets', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('loads the Opsly Universe preset from config', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);

    const preset = await loadContentChannelPreset('opsly-universe', baseDir);
    expect(preset.channel).toBe('opsly-universe');
    expect(preset.resolution).toEqual({ width: 1080, height: 1920 });
    expect(preset.sceneDurationLimits.maxMs).toBeGreaterThan(preset.sceneDurationLimits.minMs);
  });

  it('loads all channel presets', async () => {
    const baseDir = await makeBaseDir();
    tempDirs.push(baseDir);

    const presets = await loadAllContentChannelPresets(baseDir);
    expect(presets.map((preset) => preset.channel)).toEqual([
      'bitsitos',
      'splashitos',
      'opsly-universe',
    ]);
    expect(contentChannelPresetDefaults(presets[0])).toMatchObject({
      resolution: '1080x1920',
      fps: 30,
    });
  });
});
