import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ReviewFinding } from './types.js';

function assertSafePath(filePath: string): string {
  if (!filePath || filePath.includes('\0')) {
    throw new Error('unsafe path');
  }
  return filePath;
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-400)}`));
        return;
      }
      resolve();
    });
  });
}

/** Sample opening / middle / ending frames for optional vision review. */
export async function extractReviewFrames(
  videoPath: string,
  outDir: string,
  durationSec: number,
): Promise<string[]> {
  fs.mkdirSync(outDir, { recursive: true });
  const marks = [
    { name: 'opening', at: Math.min(0.5, Math.max(0.1, durationSec * 0.05)) },
    { name: 'middle', at: Math.max(0.5, durationSec * 0.5) },
    { name: 'ending', at: Math.max(0.5, durationSec * 0.9) },
  ];
  const paths: string[] = [];
  for (const mark of marks) {
    const file = path.join(outDir, `${mark.name}.jpg`);
    await runFfmpeg([
      '-y',
      '-ss',
      String(mark.at),
      '-i',
      assertSafePath(videoPath),
      '-frames:v',
      '1',
      '-q:v',
      '3',
      assertSafePath(file),
    ]);
    if (fs.existsSync(file)) paths.push(file);
  }
  return paths;
}

export interface VisionAdapterResult {
  used: boolean;
  model: string;
  findings: ReviewFinding[];
  notes: string[];
}

/**
 * Optional Gemma/vision adapter. Fail-closed: if Ollama is unavailable,
 * returns no findings and leaves FFmpeg QA as the source of truth.
 */
export async function runOptionalVisionReview(input: {
  videoPath: string;
  durationSec: number;
  workDir: string;
}): Promise<VisionAdapterResult> {
  const model = process.env.OPSLY_CONTENT_VISION_MODEL ?? 'gemma3:12b';
  const base = process.env.OLLAMA_URL?.replace(/\/$/, '');
  if (!base || process.env.OPSLY_CONTENT_VISION_ENABLED !== 'true') {
    return {
      used: false,
      model: 'ffmpeg-deterministic',
      findings: [],
      notes: ['vision adapter skipped (OPSLY_CONTENT_VISION_ENABLED!=true or no OLLAMA_URL)'],
    };
  }

  let frames: string[] = [];
  try {
    frames = await extractReviewFrames(input.videoPath, path.join(input.workDir, 'review-frames'), input.durationSec);
  } catch (error) {
    return {
      used: false,
      model,
      findings: [],
      notes: [`frame extract failed: ${error instanceof Error ? error.message : 'unknown'}`],
    };
  }

  try {
    const prompt =
      'You are an independent video QA reviewer. Describe only visible defects in these gameplay frames: ' +
      'composition, caption obstruction, crop, clarity, brand. Do not invent story events. ' +
      'Reply with JSON array of {severity,issue,recommended_fix} or [].';
    const controller = AbortSignal.timeout(12_000);
    const response = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${prompt}\nFrames: ${frames.map((f) => path.basename(f)).join(', ')}`,
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: controller,
    });
    if (!response.ok) {
      return { used: false, model, findings: [], notes: [`ollama ${response.status}`] };
    }
    const payload = (await response.json()) as { response?: string };
    const text = payload.response ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return { used: true, model, findings: [], notes: ['no JSON findings from vision model'] };
    }
    const parsed = JSON.parse(match[0]) as Array<{
      severity?: string;
      issue?: string;
      recommended_fix?: string;
    }>;
    const findings: ReviewFinding[] = parsed
      .filter((item) => item.issue && item.recommended_fix)
      .slice(0, 5)
      .map((item, index) => ({
        finding_id: `vision-${index}`,
        severity: item.severity === 'CRITICAL' || item.severity === 'IMPORTANT' || item.severity === 'MINOR'
          ? item.severity
          : 'MINOR',
        timecode_start: 0,
        timecode_end: input.durationSec,
        category: 'VIDEO',
        issue: String(item.issue),
        recommended_fix: String(item.recommended_fix),
        evidence: `vision:${model}`,
        repairable: true,
      }));
    return { used: true, model, findings, notes: [`frames=${frames.length}`] };
  } catch (error) {
    return {
      used: false,
      model,
      findings: [],
      notes: [`vision call failed: ${error instanceof Error ? error.message : 'unknown'}`],
    };
  }
}
