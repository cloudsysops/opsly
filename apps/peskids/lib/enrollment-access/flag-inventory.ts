type FlagEnv = Record<string, string | undefined>;

function flagOn(env: FlagEnv, name: string): boolean {
  const raw = env[name]?.trim().toLowerCase() ?? '';
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

export const PESKIDS_AUTOMATION_FLAG_NAMES = [
  'PESKIDS_HOT_LEAD_ALERTS_ENABLED',
  'PESKIDS_WHATSAPP_AUTO_SEND_ENABLED',
  'PESKIDS_DAILY_DIGEST_ENABLED',
  'PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED',
  'PESKIDS_LEAD_REMINDER_24H_ENABLED',
  'PESKIDS_LEAD_ESCALATION_48H_ENABLED',
  'PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED',
  'PESKIDS_TRIAL_REMINDER_ENABLED',
  'PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED',
  'PESKIDS_LEAD_CONFIRMATION_ENABLED',
] as const;

export type PeskidsAutomationFlagName = (typeof PESKIDS_AUTOMATION_FLAG_NAMES)[number];

export type PeskidsFlagInventoryRow = {
  flag: PeskidsAutomationFlagName;
  enabled: boolean;
  customer_auto_send: boolean;
};

export function inventoryPeskidsAutomationFlags(
  env: FlagEnv = process.env
): PeskidsFlagInventoryRow[] {
  return PESKIDS_AUTOMATION_FLAG_NAMES.map((flag) => ({
    flag,
    enabled: flagOn(env, flag),
    customer_auto_send: flag === 'PESKIDS_WHATSAPP_AUTO_SEND_ENABLED' && flagOn(env, flag),
  }));
}

export function anyCustomerAutoSendEnabled(env: FlagEnv = process.env): boolean {
  return inventoryPeskidsAutomationFlags(env).some((row) => row.customer_auto_send);
}
