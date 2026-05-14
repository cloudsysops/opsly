import { estimateCost } from '../router.js';
import { PROVIDERS, type ProviderId } from '../providers.js';

const DEFAULT_SYNTH_IN = 2048;
const DEFAULT_SYNTH_OUT = 900;

function approxTokensFromChars(chars: number): number {
  return Math.max(32, Math.ceil(chars / 4));
}

/**
 * Estima coste USD del ensemble (cada proveedor + síntesis Haiku).
 */
export function estimateQuantumEnsembleUsd(
  providerIds: readonly ProviderId[],
  promptChars: number
): { total_usd: number; per_provider_usd: Record<string, number> } {
  const tin = approxTokensFromChars(promptChars);
  const tout = 512;
  const per: Record<string, number> = {};
  let sum = 0;
  for (const id of providerIds) {
    const p = PROVIDERS[id];
    const c = estimateCost(p, tin, tout);
    per[id] = c;
    sum += c;
  }
  const syn = estimateCost(PROVIDERS.claude_haiku, DEFAULT_SYNTH_IN, DEFAULT_SYNTH_OUT);
  per.__synthesis__ = syn;
  sum += syn;
  const rounded = Math.round(sum * 100_000) / 100_000;
  return { total_usd: rounded, per_provider_usd: per };
}
