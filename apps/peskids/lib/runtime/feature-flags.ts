/**
 * Production readiness gates for modules that are not finished.
 *
 * The rule this enforces: hiding a module in the UI is not the same as turning
 * it off. An unfinished write API is still reachable with `curl`, so the API
 * itself must refuse. A module is only reachable in production when BOTH:
 *
 *   1. its feature flag is explicitly on, AND
 *   2. it has been explicitly declared production-ready.
 *
 * Outside production only (1) is required, so staging can exercise the module.
 * Everything defaults to OFF — an unset variable never opens a gate.
 */

import { isProduction } from '@/lib/runtime-environment';

export type ModuleGate = {
  /** Stable identifier used in error payloads and logs. */
  module: string;
  /** Env var that switches the module on at all. */
  flagVar: string;
  /** Env var that additionally certifies the module for production traffic. */
  productionReadyVar: string;
  /** Human-readable note surfaced to operators (never to end users). */
  note: string;
};

export const FRANCHISE_OS_GATE: ModuleGate = {
  module: 'franchise_os',
  flagVar: 'PESKIDS_FRANCHISE_OS_ENABLED',
  productionReadyVar: 'PESKIDS_FRANCHISE_OS_PRODUCTION_READY',
  note:
    'The in-app Franchise OS aggregate was removed in favour of the standalone ' +
    'apps/peskids-franchise app. These routes stay closed until that migration lands.',
};

export const FRANCHISE_ROYALTIES_GATE: ModuleGate = {
  module: 'franchise_royalties',
  flagVar: 'PESKIDS_FRANCHISE_ROYALTIES_ENABLED',
  productionReadyVar: 'PESKIDS_FRANCHISE_ROYALTIES_PRODUCTION_READY',
  note: 'Royalty calculation writes money-shaped records; not certified for production yet.',
};

export const STORE_GATE: ModuleGate = {
  module: 'store',
  flagVar: 'PESKIDS_STORE_ENABLED',
  productionReadyVar: 'PESKIDS_STORE_PRODUCTION_READY',
  note: 'Points store / product catalogue writes are still in development.',
};

export class ModuleDisabledError extends Error {
  readonly code = 'MODULE_DISABLED';
  readonly status = 503;
  readonly module: string;

  constructor(module: string, message: string) {
    super(message);
    this.name = 'ModuleDisabledError';
    this.module = module;
  }
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export type ModuleAvailability =
  | { available: true }
  | { available: false; reason: 'flag_off' | 'not_production_ready' };

export function moduleAvailability(
  gate: ModuleGate,
  env: NodeJS.ProcessEnv = process.env
): ModuleAvailability {
  if (!parseBooleanFlag(env[gate.flagVar])) {
    return { available: false, reason: 'flag_off' };
  }
  if (isProduction(env) && !parseBooleanFlag(env[gate.productionReadyVar])) {
    return { available: false, reason: 'not_production_ready' };
  }
  return { available: true };
}

export function isModuleEnabled(gate: ModuleGate, env: NodeJS.ProcessEnv = process.env): boolean {
  return moduleAvailability(gate, env).available;
}

/** Fail-closed guard for route handlers. Throws `ModuleDisabledError` (503). */
export function assertModuleEnabled(
  gate: ModuleGate,
  env: NodeJS.ProcessEnv = process.env
): void {
  const availability = moduleAvailability(gate, env);
  if (availability.available) return;

  const suffix =
    availability.reason === 'not_production_ready'
      ? `${gate.productionReadyVar} is not set, so it is refused in production.`
      : `${gate.flagVar} is not enabled.`;

  throw new ModuleDisabledError(gate.module, `${gate.module} is unavailable: ${suffix}`);
}
