import { describe, expect, it } from 'vitest';
import {
  BUDGET_PERCENT_CRITICAL,
  BUDGET_PERCENT_WARNING,
  budgetAlertLevelFromPercent,
  budgetUsagePercent,
  projectedMonthEndUsd,
} from '../budget-thresholds';

describe('budget-thresholds', () => {
  it('budgetUsagePercent acota a 100', () => {
    expect(budgetUsagePercent(200, 100)).toBe(100);
    expect(budgetUsagePercent(50, 100)).toBe(50);
    expect(budgetUsagePercent(-10, 100)).toBe(0);
  });

  it('budgetAlertLevelFromPercent usa umbrales 75/90', () => {
    expect(budgetAlertLevelFromPercent(50)).toBe('ok');
    expect(budgetAlertLevelFromPercent(BUDGET_PERCENT_WARNING)).toBe('warning');
    expect(budgetAlertLevelFromPercent(89)).toBe('warning');
    expect(budgetAlertLevelFromPercent(BUDGET_PERCENT_CRITICAL)).toBe('critical');
  });

  it('projectedMonthEndUsd es lineal sobre el día UTC', () => {
    const p = projectedMonthEndUsd(10);
    expect(p).toBeGreaterThan(0);
    expect(Number.isFinite(p)).toBe(true);
  });
});
