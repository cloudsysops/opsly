import type { RoutingPreference } from './providers.js';

/** Opsly virtual model aliases for Mission Control / runtime agents. */
const OPSLY_ALIAS_MAP: Record<string, RoutingPreference> = {
  'opsly:fast': 'cheap',
  'opsly:coding': 'code',
  'opsly:balanced': 'balanced',
  'opsly:quality': 'sonnet',
  'opsly:architect': 'sonnet',
  'opsly:local': 'cheap',
};

export function resolveOpslyVirtualModel(
  explicitModel: string | undefined
): { model?: string; preference?: RoutingPreference } {
  if (!explicitModel) {
    return {};
  }
  const trimmed = explicitModel.trim();
  const preference = OPSLY_ALIAS_MAP[trimmed];
  if (preference) {
    return { preference };
  }
  return { model: trimmed };
}

export function applyVirtualModelToRoutingPreference(
  explicitModel: string | undefined,
  complexityLevel: 1 | 2 | 3,
  resolveBase: (model: string | undefined, level: 1 | 2 | 3) => RoutingPreference
): RoutingPreference {
  const virtual = resolveOpslyVirtualModel(explicitModel);
  if (virtual.preference) {
    return virtual.preference;
  }
  return resolveBase(virtual.model ?? explicitModel, complexityLevel);
}
