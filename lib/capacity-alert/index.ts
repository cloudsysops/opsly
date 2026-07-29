import alertJson from './alert.json';

export type CapacityAlertSeverity = 'info' | 'warning' | 'critical';

export interface CapacityAlertChannels {
  peskids_admin_banner: boolean;
  opsly_admin_banner: boolean;
  email: boolean;
  discord: boolean;
  cursor_agent: boolean;
}

export interface CapacityAlert {
  id: string;
  active: boolean;
  severity: CapacityAlertSeverity;
  updated_at: string;
  title_es: string;
  summary_es: string;
  peskids_body_es: string;
  opsly_body_es: string;
  email_subject_es: string;
  owner_actions: string[];
  runbook: string;
  notify_runbook: string;
  channels: CapacityAlertChannels;
}

export const capacityAlert: CapacityAlert = alertJson as CapacityAlert;

export function isCapacityAlertActive(): boolean {
  return capacityAlert.active === true;
}

export function shouldShowPeskidsBanner(): boolean {
  return isCapacityAlertActive() && capacityAlert.channels.peskids_admin_banner;
}

export function shouldShowOpslyBanner(): boolean {
  return isCapacityAlertActive() && capacityAlert.channels.opsly_admin_banner;
}

export function capacityAlertDismissStorageKey(): string {
  return `opsly-capacity-alert-dismissed:${capacityAlert.id}`;
}
