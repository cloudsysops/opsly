import type { AutomationLevel } from './types.js';

export const PESKIDS_SUPPORT_AUTOMATION_CAP: AutomationLevel = 2;

export const AUTOMATION_LEVEL_LABELS: Record<AutomationLevel, string> = {
  0: 'observe only',
  1: 'recommend action',
  2: 'prepare action/draft',
  3: 'execute reversible internal action',
  4: 'external customer action',
  5: 'financial/legal/destructive action',
};

export function isAutomationLevel(value: unknown): value is AutomationLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isLevelWithinCap(level: AutomationLevel, cap: AutomationLevel): boolean {
  return level <= cap;
}

/** Customer WhatsApp send is LEVEL 4. Peskids support must not auto-promote. */
export function canPromoteAutomationLevel(
  from: AutomationLevel,
  to: AutomationLevel,
  cap: AutomationLevel = PESKIDS_SUPPORT_AUTOMATION_CAP
): boolean {
  if (to < from) {
    return true;
  }
  if (to > cap) {
    return false;
  }
  if (to >= 4) {
    return false;
  }
  return true;
}

export function denyExternalCustomerSend(level: AutomationLevel): boolean {
  return level >= 4;
}
