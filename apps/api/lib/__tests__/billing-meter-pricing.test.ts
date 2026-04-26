import { describe, expect, it } from 'vitest';
import { aiModelCostMultiplier } from '../billing-meter-pricing';

describe('aiModelCostMultiplier', () => {
  it('sube el factor para gpt-4', () => {
    expect(aiModelCostMultiplier('gpt-4-turbo')).toBe(10);
  });

  it('factor bajo para gpt-3.5', () => {
    expect(aiModelCostMultiplier('gpt-3.5-turbo')).toBe(1);
  });

  it('default intermedio para modelos desconocidos', () => {
    expect(aiModelCostMultiplier('custom-model')).toBe(2);
  });
});
