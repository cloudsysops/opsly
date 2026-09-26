import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import type { ContentTranscript, TranscriptSegment } from './types.js';

const WHISPER_BIN = process.env.OPSLY_WHISPER_BIN || 'whisper';
const WHISPER_MODEL = process.env.OPSLY_WHISPER_MODEL || 'base';

interface WhisperJsonSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperJsonOutput {
  text: string;
  language: string;
  segments: WhisperJsonSegment[];
}

export interface TranscriptionAdapter {
  name: string;
  transcribe(audioOrVideoPath: string): Promise<ContentTranscript>;
}

function readSidecarTranscript(mediaPath: string): ContentTranscript | null {
  const sidecar = `${mediaPath}.transcript.json`;
  if (!fs.existsSync(sidecar)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sidecar, 'utf8')) as ContentTranscript;
}

export function ownedFixtureTranscript(): ContentTranscript {
  const segments: TranscriptSegment[] = [
    { startSec: 0, endSec: 8, text: 'Hola. ¿Puede una IA reemplazar a un programador?' },
    { startSec: 8, endSec: 16, text: 'Nadie sabe el dato completo. En realidad el claim es demasiado grande.' },
    { startSec: 16, endSec: 24, text: 'La razon es que programar no es solo escribir codigo.' },
    { startSec: 24, endSec: 32, text: 'Imagina un experimento: la misma tarea con un humano y con un agente.' },
    { startSec: 32, endSec: 40, text: 'Por eso NØVA pregunta: ¿todos? Entonces medimos el resultado.' },
    { startSec: 40, endSec: 48, text: 'Conclusion: la IA acelera, pero no reemplaza criterio ni responsabilidad.' },
  ];
  return {
    adapter: 'owned-fixture',
    language: 'es',
    text: segments.map((segment) => segment.text).join(' '),
    segments,
  };
}

export function writeSidecarTranscript(mediaPath: string, transcript: ContentTranscript): void {
  fs.writeFileSync(`${mediaPath}.transcript.json`, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
}

export function whisperAvailable(): boolean {
  const result = spawnSync(WHISPER_BIN, ['--help'], { stdio: 'ignore' });
  return result.status === 0;
}

function runWhisper(mediaPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      WHISPER_BIN,
      [mediaPath, '--model', WHISPER_MODEL, '--output_format', 'json', '--output_dir', outputDir],
      { stdio: 'ignore' }
    );
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`whisper exited with code ${code}`));
      }
    });
  });
}

async function whisperTranscribe(mediaPath: string): Promise<ContentTranscript> {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opsly-whisper-'));
  try {
    await runWhisper(mediaPath, outputDir);
    const jsonPath = path.join(outputDir, `${path.basename(mediaPath, path.extname(mediaPath))}.json`);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`whisper ran but produced no JSON output at ${jsonPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as WhisperJsonOutput;
    const segments: TranscriptSegment[] = raw.segments.map((segment) => ({
      startSec: segment.start,
      endSec: segment.end,
      text: segment.text.trim(),
    }));
    return {
      adapter: 'whisper',
      language: raw.language,
      text: raw.text.trim(),
      segments,
    };
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

export async function transcribeMedia(mediaPath: string): Promise<ContentTranscript> {
  const sidecar = readSidecarTranscript(mediaPath);
  if (sidecar) {
    return sidecar;
  }
  if (whisperAvailable()) {
    const transcript = await whisperTranscribe(mediaPath);
    writeSidecarTranscript(mediaPath, transcript);
    return transcript;
  }
  throw new Error(`BLOCKED_TRANSCRIPTION: no sidecar transcript next to ${path.basename(mediaPath)}`);
}
