import type { DataConfidence, LabeledValue } from './types.js';

export function confidenceLabel(confidence: DataConfidence): string {
  return confidence;
}

export function omitMrrUntilCommercialSource(): LabeledValue<null> {
  return {
    value: null,
    confidence: 'PROYECTADO',
    source: 'none',
    omittedReason:
      'MRR oculto hasta fuente comercial confiable (Stripe/billing REAL).',
  };
}

export function labelEstimatedCatalog(source: string): DataConfidence {
  void source;
  return 'ESTIMADO';
}
