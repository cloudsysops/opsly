import { ContentProjectEnvelopeSchema } from './types.js';
import type { ContentProjectEnvelope } from './types.js';

export function parseContentProjectEnvelope(value: unknown): ContentProjectEnvelope {
  return ContentProjectEnvelopeSchema.parse(value) as ContentProjectEnvelope;
}
