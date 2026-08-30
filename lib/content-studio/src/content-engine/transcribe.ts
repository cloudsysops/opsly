import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ContentTranscript, TranscriptSegment } from './types.js';

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

async function whisperAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('whisper', ['--help'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

export async function transcribeMedia(mediaPath: string): Promise<ContentTranscript> {
  const sidecar = readSidecarTranscript(mediaPath);
  if (sidecar) {
    return sidecar;
  }
  if (await whisperAvailable()) {
    throw new Error('BLOCKED_WHISPER_ADAPTER: whisper is present but JSON export is not wired yet');
  }
  throw new Error(`BLOCKED_TRANSCRIPTION: no sidecar transcript next to ${path.basename(mediaPath)}`);
}
