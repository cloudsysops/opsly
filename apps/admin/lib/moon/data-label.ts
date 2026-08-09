/**
 * Financial / metric confidence labels for Opsly Moon.
 * Never present ESTIMATED or PROJECTED figures as live commercial truth.
 */

export type MoonDataConfidence = 'REAL' | 'ESTIMADO' | 'PROYECTADO';

export type MoonLabeledValue<T> = {
  value: T;
  confidence: MoonDataConfidence;
  source: string;
  omittedReason?: string;
};

export function moonConfidenceLabel(confidence: MoonDataConfidence): string {
  return confidence;
}

export function omitMrrUntilCommercialSource(): MoonLabeledValue<null> {
  return {
    value: null,
    confidence: 'PROYECTADO',
    source: 'none',
    omittedReason: 'MRR oculto hasta fuente comercial confiable (Stripe/billing REAL).',
  };
}
