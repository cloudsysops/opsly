export const MODEL_CONFIG = {
  sonnet: {
    id: "claude-sonnet-4-20250514",
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015,
  },
  haiku: {
    id: "claude-haiku-4-5-20251001",
    cost_per_1k_input: 0.00025,
    cost_per_1k_output: 0.00125,
  },
} as const;

type ModelConfig = (typeof MODEL_CONFIG)[keyof typeof MODEL_CONFIG];

export function selectModel(
  preference: "sonnet" | "haiku" = "sonnet",
  fallback = false,
): ModelConfig {
  if (fallback) {
    return MODEL_CONFIG.haiku;
  }
  return MODEL_CONFIG[preference];
}

export function estimateCost(
  model: ModelConfig,
  tokensInput: number,
  tokensOutput: number,
): number {
  const inputCost = (tokensInput / 1000) * model.cost_per_1k_input;
  const outputCost = (tokensOutput / 1000) * model.cost_per_1k_output;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
