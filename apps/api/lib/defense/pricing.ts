export type DefensePlanKey = 'starter' | 'pro' | 'enterprise';

export interface DefensePlanDefinition {
  name: string;
  priceUsd: number | null;
  interval: 'month';
  features: readonly string[];
}

export const DEFENSE_PLANS: Record<DefensePlanKey, DefensePlanDefinition> = {
  starter: {
    name: 'Starter',
    priceUsd: 299,
    interval: 'month',
    features: [
      'Basic security audit (quarterly)',
      'Vulnerability scanning',
      'Up to 10 tracked findings',
      'Email summary reports',
    ],
  },
  pro: {
    name: 'Pro',
    priceUsd: 799,
    interval: 'month',
    features: [
      'Advanced security audit (monthly)',
      'Compliance framework assessment',
      'Penetration test coordination (1x/year)',
      'Unlimited findings in platform',
      'API access for exports',
      'Slack / Discord notifications (optional)',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    priceUsd: null,
    interval: 'month',
    features: [
      'Continuous security monitoring hooks',
      'Dedicated security consultant (scoped)',
      'Custom compliance roadmap',
      'Quarterly penetration tests (as agreed)',
      'Priority remediation playbooks',
      'SLA by statement of work',
    ],
  },
} as const;
