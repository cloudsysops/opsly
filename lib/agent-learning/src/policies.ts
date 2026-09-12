import type { PromotionPolicy } from './types.js';

/**
 * Default trust ladder thresholds for Agent Lab MVP.
 * No agent starts at autonomous_low_risk; that step is never auto-granted here.
 */
export const DEFAULT_PROMOTION_POLICIES: readonly PromotionPolicy[] = [
  {
    from_level: 'observe',
    to_level: 'shadow',
    minimum_tasks: 5,
    min_supervisor_agreement: 0.7,
    max_critical_failures: 2,
    min_success_rate: 0.7,
  },
  {
    from_level: 'shadow',
    to_level: 'supervised',
    minimum_tasks: 15,
    min_supervisor_agreement: 0.8,
    max_critical_failures: 1,
    min_success_rate: 0.8,
  },
  {
    from_level: 'supervised',
    to_level: 'trusted',
    minimum_tasks: 30,
    min_supervisor_agreement: 0.9,
    max_critical_failures: 0,
    min_success_rate: 0.9,
  },
] as const;

/** Rolling failure window that triggers demotion when all entries fail. */
export const DEFAULT_DEMOTION_FAILURE_WINDOW = 3;

/** Success-rate floor; below this, demote one trust level. */
export const DEFAULT_DEMOTION_SUCCESS_FLOOR = 0.8;
