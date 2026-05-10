import type { ProviderId } from '../providers.js';

export interface QuantumBranchSummary {
  id: ProviderId;
  ok: boolean;
  content: string;
}

/**
 * Puntuación heurística para ordenar respuestas antes de la síntesis.
 */
export function scoreAndRank(summaries: readonly QuantumBranchSummary[]): QuantumBranchSummary[] {
  const scored = summaries
    .filter((s) => s.ok && s.content.trim().length > 0)
    .map((s) => {
      const len = s.content.trim().length;
      let score = Math.min(100, len / 25);
      if (/error|failed|cannot|sorry/i.test(s.content)) {
        score -= 20;
      }
      if (len > 80) {
        score += 5;
      }
      return { summary: s, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.summary);
}
