import { PROVIDERS } from './providers.js';

export const MODEL_CONFIG = {
  sonnet: {
    id: PROVIDERS.claude_sonnet.model,
    cost_per_1k_input: PROVIDERS.claude_sonnet.cost_per_1k_input,
    cost_per_1k_output: PROVIDERS.claude_sonnet.cost_per_1k_output,
  },
  haiku: {
    id: PROVIDERS.claude_haiku.model,
    cost_per_1k_input: PROVIDERS.claude_haiku.cost_per_1k_input,
    cost_per_1k_output: PROVIDERS.claude_haiku.cost_per_1k_output,
  },
} as const;

type ModelConfig = (typeof MODEL_CONFIG)[keyof typeof MODEL_CONFIG];

export type Costable = {
  cost_per_1k_input: number;
  cost_per_1k_output: number;
};

export function selectModel(
  preference: 'sonnet' | 'haiku' = 'sonnet',
  fallback = false
): ModelConfig {
  if (fallback) {
    return MODEL_CONFIG.haiku;
  }
  return MODEL_CONFIG[preference];
}

export function estimateCost(
  model: ModelConfig | Costable,
  tokensInput: number,
  tokensOutput: number
): number {
  const inputCost = (tokensInput / 1000) * model.cost_per_1k_input;
  const outputCost = (tokensOutput / 1000) * model.cost_per_1k_output;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
