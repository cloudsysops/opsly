/**
 * Fallback Chain para el LLM Gateway.
 *
 * Agrega lógica de recuperación automática sobre `llmCallDirect`:
 *   1. Intenta la llamada normalmente.
 *   2. Si falla, registra el fallo del proveedor primario en Redis.
 *   3. Reintenta con una preferencia de routing degradada (sonnet→haiku→cheap).
 *   4. Emite log estructurado `fallback_activated`.
 *
 * No duplica la cadena interna de `llmCallDirect` — la extiende con memoria cross-llamada.
 */

import type { LLMRequest, LLMResponse } from './types.js';
import { llmCallDirect } from './llm-direct.js';
import { getProvidersByPreference, resolveRoutingPreference } from './providers.js';
import { applyRoutingBias } from './routing-hints.js';
import { getRedisClient } from './cache.js';

const PROVIDER_CIRCUIT_PREFIX = 'circuit:llm:';
const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS = 60_000;

interface ProviderHealth {
  failures: number;
  openedAt: number;
}

async function getProviderHealth(healthKey: string): Promise<ProviderHealth> {
  try {
    const redis = await getRedisClient();
    const raw = await redis.get(`${PROVIDER_CIRCUIT_PREFIX}${healthKey}`);
    if (!raw) return { failures: 0, openedAt: 0 };
    return JSON.parse(raw) as ProviderHealth;
  } catch {
    return { failures: 0, openedAt: 0 };
  }
}

async function recordProviderFailure(healthKey: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const current = await getProviderHealth(healthKey);
    const failures = current.failures + 1;
    const openedAt = failures >= FAILURE_THRESHOLD ? Date.now() : current.openedAt;
    const ttlSeconds = Math.ceil((OPEN_DURATION_MS * 3) / 1_000);
    await redis.set(
      `${PROVIDER_CIRCUIT_PREFIX}${healthKey}`,
      JSON.stringify({ failures, openedAt }),
      { EX: ttlSeconds }
    );
  } catch {
    // degraded mode
  }
}

async function resetProviderHealth(healthKey: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(`${PROVIDER_CIRCUIT_PREFIX}${healthKey}`);
  } catch {
    // degraded mode
  }
}

function isProviderOpen(health: ProviderHealth): boolean {
  if (health.failures < FAILURE_THRESHOLD) return false;
  return Date.now() - health.openedAt < OPEN_DURATION_MS;
}

/** Preferencia degradada: sonnet → haiku → cheap → cheap (sin más degradación). */
function degradePreference(current: string): string {
  if (current === 'sonnet') return 'haiku';
  return 'cheap';
}

/**
 * Ejecuta la llamada LLM con fallback entre niveles de proveedor.
 * Si el proveedor primario tiene su circuit open o falla, intenta con menor preferencia.
 */
export async function llmCallWithFallback(req: LLMRequest): Promise<LLMResponse> {
  const base = resolveRoutingPreference(req.model, 2);
  const preference = req.routing_bias ? applyRoutingBias(base, 2, req.routing_bias) : base;
  const chain = getProvidersByPreference(preference);
  const primary = chain[0];

  // Verificar si el proveedor primario tiene el circuit abierto
  const primaryHealth = await getProviderHealth(primary.healthKey);
  if (isProviderOpen(primaryHealth)) {
    const fallbackPref = degradePreference(preference);
    console.warn(
      JSON.stringify({
        event: 'fallback_activated',
        reason: 'circuit_open',
        failed_provider: primary.id,
        fallback_preference: fallbackPref,
        ts: new Date().toISOString(),
      })
    );
    return llmCallDirect({ ...req, model: fallbackPref, routing_bias: undefined });
  }

  try {
    const result = await llmCallDirect(req);
    await resetProviderHealth(primary.healthKey);
    return result;
  } catch (err) {
    await recordProviderFailure(primary.healthKey);

    const fallbackPref = degradePreference(preference);
    console.warn(
      JSON.stringify({
        event: 'fallback_activated',
        reason: 'provider_error',
        failed_provider: primary.id,
        fallback_preference: fallbackPref,
        error: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      })
    );

    return llmCallDirect({ ...req, model: fallbackPref, routing_bias: undefined });
  }
}
