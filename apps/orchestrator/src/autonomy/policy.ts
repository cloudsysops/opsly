import type { JobType } from '../types.js';

export type AutonomyRiskLevel = 'low' | 'medium' | 'high';

export interface AutonomyPolicy {
  riskLevel: AutonomyRiskLevel;
  requiresApproval: boolean;
  maxAttempts: number;
  backoffDelayMs: number;
  allowAutoRollback: boolean;
}

const LOW_RISK_POLICY: AutonomyPolicy = {
  riskLevel: 'low',
  requiresApproval: false,
  maxAttempts: 3,
  backoffDelayMs: 2_000,
  allowAutoRollback: true,
};

const MEDIUM_RISK_POLICY: AutonomyPolicy = {
  riskLevel: 'medium',
  requiresApproval: false,
  maxAttempts: 2,
  backoffDelayMs: 5_000,
  allowAutoRollback: true,
};

const HIGH_RISK_POLICY: AutonomyPolicy = {
  riskLevel: 'high',
  requiresApproval: true,
  maxAttempts: 1,
  backoffDelayMs: 10_000,
  allowAutoRollback: false,
};

export function resolveAutonomyPolicy(
  jobType: JobType,
  explicitRisk?: AutonomyRiskLevel
): AutonomyPolicy {
  if (explicitRisk) {
    return explicitRisk === 'low'
      ? LOW_RISK_POLICY
      : explicitRisk === 'medium'
        ? MEDIUM_RISK_POLICY
        : HIGH_RISK_POLICY;
  }

  if (jobType === 'notify' || jobType === 'drive' || jobType === 'health') {
    return LOW_RISK_POLICY;
  }

  if (
    jobType === 'cursor' ||
    jobType === 'n8n' ||
    jobType === 'research' ||
    jobType === 'ollama' ||
    jobType === 'defense_audit' ||
    jobType === 'cloudsysops_sales_message' ||
    jobType === 'cloudsysops_ops_complete'
  ) {
    return MEDIUM_RISK_POLICY;
  }

  return HIGH_RISK_POLICY;
}

export function parseAutonomyRiskLevel(value: unknown): AutonomyRiskLevel | undefined {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return undefined;
}
