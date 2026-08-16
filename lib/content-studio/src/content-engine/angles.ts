import type { ContentPortal, OpportunityScore, TransformativeAngleResult } from './types.js';

const ANGLE_HINTS: Array<{ angle: TransformativeAngleResult['angle']; pattern: RegExp }> = [
  { angle: 'TEST', pattern: /(reemplazar|replace|siempre|nunca|todos|ninguno|every|all)/i },
  { angle: 'FACT_CHECK', pattern: /(mentira|falso|verdad|dato)/i },
  { angle: 'COMPARE', pattern: /(mejor|peor|versus|contra)/i },
  { angle: 'EXPLAIN', pattern: /(por que|porque|como)/i },
  { angle: 'EDUCATE', pattern: /(aprender|ensenar|clase)/i },
];

export function proposeTransformativeAngle(input: {
  sourceMoment: string;
  claim: string;
  portal?: ContentPortal;
}): TransformativeAngleResult {
  const matched = ANGLE_HINTS.find((hint) => hint.pattern.test(input.claim));
  const angle = matched?.angle ?? 'CONTEXTUALIZE';
  const novaQuestion = input.claim.includes('?') ? input.claim : `¿${input.claim.replace(/\.$/, '')}?`;
  return {
    sourceMoment: input.sourceMoment,
    claim: input.claim,
    angle,
    novaQuestion: novaQuestion.startsWith('¿') ? novaQuestion : `¿De verdad ${input.claim}?`,
    originalContribution: `NØVA investiga el claim en el portal ${input.portal ?? 'FUTURE'} con explicación y experimento propio.`,
    researchNeeded: ['Definir el claim verificable', 'Buscar contraejemplo', 'Diseñar un experimento reproducible'],
    suggestedExperiment: 'Correr la misma tarea con un humano y un agente Opsly y comparar el resultado.',
    rightsRisk: 'REVIEW_REQUIRED',
  };
}

export function scoreOpportunity(input: {
  trendScore?: number;
  hookScore?: number;
  storyScore?: number;
  educationalScore?: number;
  brandFitScore?: number;
  timelinessScore?: number;
}): OpportunityScore {
  const trendScore = input.trendScore ?? 50;
  const hookScore = input.hookScore ?? 50;
  const storyScore = input.storyScore ?? 50;
  const educationalScore = input.educationalScore ?? 50;
  const brandFitScore = input.brandFitScore ?? 50;
  const timelinessScore = input.timelinessScore ?? 50;
  const overallOpportunityScore = Math.round(
    trendScore * 0.15 +
      hookScore * 0.2 +
      storyScore * 0.2 +
      educationalScore * 0.2 +
      brandFitScore * 0.15 +
      timelinessScore * 0.1
  );
  return {
    trendScore,
    hookScore,
    storyScore,
    educationalScore,
    brandFitScore,
    timelinessScore,
    overallOpportunityScore,
    reasons: [
      `Hook ${hookScore}/100`,
      `Educational ${educationalScore}/100`,
      `Brand fit ${brandFitScore}/100`,
    ],
  };
}
