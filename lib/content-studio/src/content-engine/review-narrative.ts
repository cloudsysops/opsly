import type { ReviewFinding } from './types.js';

export interface NarrativeAdapterResult {
  used: boolean;
  model: string;
  findings: ReviewFinding[];
  notes: string[];
}

/**
 * Optional Qwen narrative reviewer. Independent of the creator agent context.
 * Fail-closed when local LLM is unavailable — deterministic QA still runs.
 */
export async function runOptionalNarrativeReview(input: {
  title?: string;
  captions?: string;
  transcript?: string;
  durationSec: number;
}): Promise<NarrativeAdapterResult> {
  const model = process.env.OPSLY_CONTENT_NARRATIVE_MODEL ?? 'qwen3:14b';
  const base = process.env.OLLAMA_URL?.replace(/\/$/, '');
  if (!base || process.env.OPSLY_CONTENT_NARRATIVE_ENABLED !== 'true') {
    return {
      used: false,
      model: 'metadata-deterministic',
      findings: [],
      notes: ['narrative adapter skipped (OPSLY_CONTENT_NARRATIVE_ENABLED!=true or no OLLAMA_URL)'],
    };
  }

  const prompt = [
    'You are an independent narrative reviewer for a gameplay short.',
    'Creator reasoning is withheld. Review only the final artifact text.',
    'Do not invent events not present in the transcript/captions.',
    'Score hook, pacing, payoff, dead time, repetition, title alignment.',
    'Reply JSON array of {severity,category,issue,recommended_fix} or [].',
    `title: ${input.title ?? ''}`,
    `captions: ${input.captions ?? ''}`,
    `transcript: ${(input.transcript ?? '').slice(0, 1200)}`,
    `durationSec: ${input.durationSec}`,
  ].join('\n');

  try {
    const response = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      return { used: false, model, findings: [], notes: [`ollama ${response.status}`] };
    }
    const payload = (await response.json()) as { response?: string };
    const text = payload.response ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return { used: true, model, findings: [], notes: ['no JSON findings from narrative model'] };
    }
    const parsed = JSON.parse(match[0]) as Array<{
      severity?: string;
      category?: string;
      issue?: string;
      recommended_fix?: string;
    }>;
    const allowed = new Set(['HOOK', 'PACING', 'STORY', 'GAMEPLAY', 'CAPTIONS', 'METADATA']);
    const findings: ReviewFinding[] = parsed
      .filter((item) => item.issue && item.recommended_fix)
      .slice(0, 5)
      .map((item, index) => ({
        finding_id: `narrative-${index}`,
        severity: item.severity === 'CRITICAL' || item.severity === 'IMPORTANT' || item.severity === 'MINOR'
          ? item.severity
          : 'MINOR',
        timecode_start: 0,
        timecode_end: input.durationSec,
        category: allowed.has(String(item.category)) ? (item.category as ReviewFinding['category']) : 'STORY',
        issue: String(item.issue),
        recommended_fix: String(item.recommended_fix),
        evidence: `narrative:${model}`,
        repairable: true,
      }));
    return { used: true, model, findings, notes: [] };
  } catch (error) {
    return {
      used: false,
      model,
      findings: [],
      notes: [`narrative call failed: ${error instanceof Error ? error.message : 'unknown'}`],
    };
  }
}
