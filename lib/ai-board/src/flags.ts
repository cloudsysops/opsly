import type { FeatureFlagRecord } from './types.js';

/**
 * Governance catalog for Peskids automation flags.
 * AI Board may recommend activation; customer-facing sends stay off.
 */
export const PESKIDS_FLAG_REGISTRY: readonly FeatureFlagRecord[] = [
  {
    flag: 'PESKIDS_HOT_LEAD_ALERTS_ENABLED',
    owner: 'peskids-support',
    environment: 'prd',
    risk: 'medium',
    current_state: 'off',
    staging_evidence: null,
    activation_timestamp: null,
    metrics: ['hot_leads', 'automation_failures'],
    rollback_switch: 'PESKIDS_HOT_LEAD_ALERTS_ENABLED=false',
    customer_facing_send: false,
    automation_level: 1,
  },
  {
    flag: 'PESKIDS_DAILY_DIGEST_ENABLED',
    owner: 'peskids-support',
    environment: 'prd',
    risk: 'low',
    current_state: 'off',
    staging_evidence: null,
    activation_timestamp: null,
    metrics: ['agent_jobs'],
    rollback_switch: 'PESKIDS_DAILY_DIGEST_ENABLED=false',
    customer_facing_send: false,
    automation_level: 1,
  },
  {
    flag: 'PESKIDS_LEAD_CONFIRMATION_ENABLED',
    owner: 'peskids-support',
    environment: 'prd',
    risk: 'medium',
    current_state: 'off',
    staging_evidence: null,
    activation_timestamp: null,
    metrics: ['leads_received'],
    rollback_switch: 'PESKIDS_LEAD_CONFIRMATION_ENABLED=false',
    customer_facing_send: true,
    automation_level: 4,
  },
  {
    flag: 'PESKIDS_WHATSAPP_AUTO_SEND_ENABLED',
    owner: 'peskids-support',
    environment: 'prd',
    risk: 'high',
    current_state: 'off',
    staging_evidence: null,
    activation_timestamp: null,
    metrics: ['messages_confirmed_sent', 'whatsapp_opened'],
    rollback_switch: 'PESKIDS_WHATSAPP_AUTO_SEND_ENABLED=false',
    customer_facing_send: true,
    automation_level: 4,
  },
];

const REQUIRED_FLAG_FIELDS: readonly (keyof FeatureFlagRecord)[] = [
  'flag',
  'owner',
  'environment',
  'risk',
  'current_state',
  'staging_evidence',
  'activation_timestamp',
  'metrics',
  'rollback_switch',
];

export function assertFlagGovernance(record: FeatureFlagRecord): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_FLAG_FIELDS) {
    if (record[field] === undefined) {
      missing.push(field);
    }
  }
  if (record.metrics.length === 0) {
    missing.push('metrics');
  }
  return missing;
}

export function customerFacingFlagsEnabled(records = PESKIDS_FLAG_REGISTRY): string[] {
  return records
    .filter((row) => row.customer_facing_send && row.current_state === 'on')
    .map((row) => row.flag);
}

export function unprovenCustomerWorkflows(records = PESKIDS_FLAG_REGISTRY): string[] {
  return records
    .filter(
      (row) =>
        row.customer_facing_send &&
        row.current_state !== 'off' &&
        row.staging_evidence === null
    )
    .map((row) => row.flag);
}
