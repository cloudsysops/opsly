import type { ToolManifest } from './types.js';

export const DummySquareTool: ToolManifest = {
  name: 'dummy_square',
  description: 'Calcula el cuadrado de un número entero o decimal.',
  capabilities: ['math', 'calculation'],
  riskLevel: 'low',
  async execute(input: unknown): Promise<unknown> {
    const value =
      typeof input === 'object' && input !== null
        ? (input as Record<string, unknown>).value
        : input;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      return {
        ok: false,
        error: 'invalid number',
      };
    }
    return {
      ok: true,
      value: n,
      square: n * n,
    };
  },
};
