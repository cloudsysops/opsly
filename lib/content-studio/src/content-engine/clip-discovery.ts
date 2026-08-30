import type { ClipCandidate, ContentTranscript } from './types.js';

const HOOK_PATTERNS: Array<{ category: string; pattern: RegExp; weight: number }> = [
  { category: 'question', pattern: /\?/, weight: 18 },
  { category: 'strong_opening', pattern: /^(hola|mira|espera|nunca|nadie|todos|imagina)/i, weight: 16 },
  { category: 'surprising_statement', pattern: /(nunca|imposible|mentira|secreto|nadie sabe)/i, weight: 14 },
  { category: 'emotion', pattern: /(miedo|amor|llorar|alegria|rabia|asombro)/i, weight: 12 },
  { category: 'story', pattern: /(cuando|historia|entonces|despues)/i, weight: 10 },
  { category: 'controversy', pattern: /(reemplazar|nunca mas|falso|verdad)/i, weight: 12 },
  { category: 'educational_insight', pattern: /(porque|por que|como funciona|la razon)/i, weight: 14 },
  { category: 'unexpected_fact', pattern: /(dato|increible|sabias|en realidad)/i, weight: 12 },
  { category: 'clear_conclusion', pattern: /(por eso|en resumen|conclusion|entonces)/i, weight: 10 },
];

function clampDuration(start: number, end: number, minSec: number, maxSec: number): { start: number; end: number } {
  const duration = end - start;
  if (duration < minSec) {
    return { start, end: start + minSec };
  }
  if (duration > maxSec) {
    return { start, end: start + maxSec };
  }
  return { start, end };
}

function scoreSegment(text: string): { score: number; reasons: string[]; category: string } {
  const reasons: string[] = [];
  let score = 8;
  let category = 'statement';
  for (const rule of HOOK_PATTERNS) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
      reasons.push(rule.category);
      category = rule.category;
    }
  }
  if (text.length > 40 && text.length < 180) {
    score += 6;
    reasons.push('spoken_length');
  }
  return { score: Math.min(100, score), reasons, category };
}

export function discoverClips(
  transcript: ContentTranscript,
  options?: { minSec?: number; maxSec?: number; limit?: number }
): ClipCandidate[] {
  const minSec = options?.minSec ?? 8;
  const maxSec = options?.maxSec ?? 45;
  const limit = options?.limit ?? 5;
  const candidates = transcript.segments.map((segment, index) => {
    const bounded = clampDuration(segment.startSec, segment.endSec, minSec, maxSec);
    const scored = scoreSegment(segment.text);
    const hook = segment.text.split(/[.?!]/)[0]?.trim() || segment.text.slice(0, 80);
    return {
      id: `clip-${String(index + 1).padStart(3, '0')}`,
      start: bounded.start,
      end: bounded.end,
      duration: Number((bounded.end - bounded.start).toFixed(2)),
      transcript: segment.text,
      hook,
      category: scored.category,
      score: scored.score,
      reasons: scored.reasons,
    } satisfies ClipCandidate;
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}
