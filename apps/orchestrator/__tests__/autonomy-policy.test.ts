import { describe, expect, it } from 'vitest';
import { parseAutonomyRiskLevel, resolveAutonomyPolicy } from '../src/autonomy/policy.js';

describe('autonomy policy', () => {
  it('assigns low risk to notify jobs', () => {
    const policy = resolveAutonomyPolicy('notify');
    expect(policy.riskLevel).toBe('low');
    expect(policy.requiresApproval).toBe(false);
  });

  it('assigns high risk to hive jobs by default', () => {
    const policy = resolveAutonomyPolicy('hive_objective');
    expect(policy.riskLevel).toBe('high');
    expect(policy.requiresApproval).toBe(true);
  });

  it('accepts explicit risk override', () => {
    const policy = resolveAutonomyPolicy('notify', 'high');
    expect(policy.riskLevel).toBe('high');
    expect(policy.maxAttempts).toBe(1);
  });

  it('parses only valid risk levels', () => {
    expect(parseAutonomyRiskLevel('medium')).toBe('medium');
    expect(parseAutonomyRiskLevel('invalid')).toBeUndefined();
  });
});
