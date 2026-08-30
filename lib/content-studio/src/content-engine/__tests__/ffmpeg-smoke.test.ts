import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ffmpegAvailable, generateOwnedFixture, probeMedia, splitScreen, titleCard, verticalReframe } from '../ffmpeg.js';

const skip = !ffmpegAvailable();

describe.skipIf(skip)('ffmpeg smoke', () => {
  it('generates a fixture, reframes 9:16, and split-screens', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-os-ff-'));
    const source = path.join(dir, 'source.mp4');
    const vertical = path.join(dir, 'vertical.mp4');
    const card = path.join(dir, 'nova.mp4');
    const split = path.join(dir, 'split.mp4');
    await generateOwnedFixture(source, 2);
    const probe = await probeMedia(source);
    expect(probe.duration).toBeGreaterThan(1);
    await verticalReframe(source, vertical);
    const verticalProbe = await probeMedia(vertical);
    expect(verticalProbe.width).toBe(1080);
    expect(verticalProbe.height).toBe(1920);
    await titleCard(card, 'NOVA', 2);
    await splitScreen(source, card, split);
    expect(fs.existsSync(split)).toBe(true);
  }, 60_000);
});
