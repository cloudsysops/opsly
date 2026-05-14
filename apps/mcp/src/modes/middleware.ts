/**
 * Resolución de modo activo por `sessionId` (Redis) + validación de plan.
 */

import type { BillingPlan, BuiltInModeDefinition, OpslyModeId } from './types.js';
import { BUILT_IN_MODES, getModeConfig, validateModeAccess } from './registry.js';
import { redisClearActiveMode, redisGetActiveMode, redisSetActiveMode } from './redis-store.js';

const DEFAULT_MODE: OpslyModeId = 'developer';

export class ModePlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModePlanError';
  }
}

export class ModeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModeNotFoundError';
  }
}

export interface ResolvedModeContext {
  modeId: OpslyModeId;
  definition: BuiltInModeDefinition;
}

export async function resolveModeContext(sessionId: string): Promise<ResolvedModeContext> {
  const raw = (await redisGetActiveMode(sessionId))?.trim();
  const modeId = (raw && raw in BUILT_IN_MODES ? raw : DEFAULT_MODE) as OpslyModeId;
  const definition = BUILT_IN_MODES[modeId];
  return { modeId, definition };
}

export async function setActiveMode(
  sessionId: string,
  modeId: OpslyModeId,
  tenantPlan: BillingPlan,
): Promise<void> {
  if (!BUILT_IN_MODES[modeId]) {
    throw new ModeNotFoundError(`Unknown mode: ${modeId}`);
  }
  if (!validateModeAccess(modeId, tenantPlan)) {
    throw new ModePlanError(`Mode "${modeId}" requires a higher tenant plan.`);
  }
  await redisSetActiveMode(sessionId, modeId);
}

export async function clearMode(sessionId: string): Promise<void> {
  await redisClearActiveMode(sessionId);
}

/** Expuesto para tests: modo por id sin Redis. */
export function getDefinitionOrThrow(modeId: OpslyModeId): BuiltInModeDefinition {
  const def = getModeConfig(modeId);
  if (!def) {
    throw new ModeNotFoundError(`Unknown mode: ${modeId}`);
  }
  return def;
}
