import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateOwnedFixture } from '../ffmpeg.js';
import { transcribeMedia, whisperAvailable } from '../transcribe.js';

const skip = !whisperAvailable();

describe.skipIf(skip)('whisper transcription smoke', () => {
  it('transcribes a generated fixture and writes a sidecar', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-os-whisper-'));
    const source = path.join(dir, 'source.mp4');
    await generateOwnedFixture(source, 3);

    const transcript = await transcribeMedia(source);
    expect(transcript.adapter).toBe('whisper');
    expect(typeof transcript.language).toBe('string');
    expect(Array.isArray(transcript.segments)).toBe(true);

    const sidecarPath = `${source}.transcript.json`;
    expect(fs.existsSync(sidecarPath)).toBe(true);

    const second = await transcribeMedia(source);
    expect(second).toEqual(transcript);
  }, 120_000);
});
