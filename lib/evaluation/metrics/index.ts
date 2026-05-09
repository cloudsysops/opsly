export interface QualityMetrics {
  bleu?: number;
  rouge?: number;
  perplexity?: number;
  customScore?: number;
}

export interface SafetyMetrics {
  piiDetected: boolean;
  hallucination: boolean;
  toxicity: number;
}

export interface PerformanceMetrics {
  latencyMs: number;
  tokensUsed: number;
  costUsd: number;
}

export function calculateBleu(reference: string, generated: string): number {
  // Simplified BLEU score (0-1)
  const refWords = reference.split(' ');
  const genWords = generated.split(' ');
  const matches = genWords.filter(w => refWords.includes(w)).length;
  return Math.min(1, matches / Math.max(1, genWords.length));
}

export function calculateRouge(reference: string, generated: string): number {
  // Simplified ROUGE score
  const refWords = new Set(reference.split(' '));
  const genWords = generated.split(' ');
  const matches = genWords.filter(w => refWords.has(w)).length;
  return Math.min(1, matches / Math.max(1, genWords.length));
}

export function scoreQuality(
  reference: string,
  generated: string,
  custom?: (a: string, b: string) => number
): QualityMetrics {
  return {
    bleu: calculateBleu(reference, generated),
    rouge: calculateRouge(reference, generated),
    customScore: custom ? custom(reference, generated) : undefined,
  };
}
