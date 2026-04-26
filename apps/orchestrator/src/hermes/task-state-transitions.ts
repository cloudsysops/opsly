import type { HermesTaskState } from '@intcloudsysops/types';

const VALID: Record<HermesTaskState, HermesTaskState[]> = {
  PENDING: ['ROUTED', 'BLOCKED', 'FAILED'],
  ROUTED: ['EXECUTING', 'FAILED', 'BLOCKED'],
  EXECUTING: ['COMPLETED', 'FAILED', 'BLOCKED'],
  COMPLETED: [],
  FAILED: [],
  BLOCKED: ['PENDING', 'ROUTED'],
};

export function isValidHermesTransition(from: HermesTaskState, to: HermesTaskState): boolean {
  return VALID[from].includes(to);
}
