/**
 * Worker Selector - Decide dónde ejecutar un job
 * Local-First: intenta local primero, fallback a remoto
 */

import {
  detectEnvironment,
  healthCheck,
  EnvironmentCapabilities,
  HealthCheckResult,
} from './environment-detector';

export type WorkerType = 'local' | 'ollama' | 'vps' | 'worker-mac2011' | 'remote';

export interface WorkerConfig {
  type: WorkerType;
  endpoint?: string;
  priority: number; // 0 = highest
  maxTokens?: number;
  costPerToken?: number;
  available: boolean;
}

export interface SelectionCriteria {
  budget: 'low' | 'medium' | 'high';
  requiredCapabilities?: string[];
  maxDuration?: number;
  preferredWorker?: WorkerType;
}

export interface SelectionResult {
  worker: WorkerConfig;
  reason: string;
  fallbackWorkers: WorkerConfig[];
}

/**
 * Configuración de workers disponibles
 */
export const getWorkerConfig = (env: EnvironmentCapabilities): WorkerConfig[] => {
  const workers: WorkerConfig[] = [];

  // Local agents
  if (env.agents.cursor.installed) {
    workers.push({
      type: 'local',
      endpoint: 'cursor',
      priority: 10,
      maxTokens: 100000,
      costPerToken: 0, // gratis
      available: true,
    });
  }

  // Ollama
  if (env.ollama.installed && env.ollama.running) {
    workers.push({
      type: 'ollama',
      endpoint: env.ollama.url || 'http://localhost:11434',
      priority: 20,
      maxTokens: 128000,
      costPerToken: 0, // gratis
      available: true,
    });
  }

  // VPS worker (from environment)
  if (process.env.OPSLY_VPS_URL) {
    workers.push({
      type: 'vps',
      endpoint: process.env.OPSLY_VPS_URL,
      priority: 50,
      maxTokens: 200000,
      costPerToken: 0.0001, // estimado
      available: true,
    });
  }

  // Mac 2011 worker (from environment)
  if (process.env.OPSLY_WORKER_MAC2011_URL) {
    workers.push({
      type: 'worker-mac2011',
      endpoint: process.env.OPSLY_WORKER_MAC2011_URL,
      priority: 30,
      maxTokens: 128000,
      costPerToken: 0, // mismo local
      available: true,
    });
  }

  // Remote fallback (cloud LLM)
  workers.push({
    type: 'remote',
    endpoint: process.env.LLM_GATEWAY_URL || 'http://localhost:3010',
    priority: 100,
    maxTokens: 200000,
    costPerToken: 0.001, // estimado cloud
    available: true,
  });

  return workers;
};

/**
 * Seleccionar mejor worker basado en criteria
 */
export async function selectWorker(criteria: SelectionCriteria): Promise<SelectionResult> {
  const [env, health] = await Promise.all([detectEnvironment(), healthCheck()]);

  const workers = getWorkerConfig(env);

  // Filtrar por disponibilidad y salud
  const availableWorkers = workers.filter((w) => {
    if (!w.available) return false;

    // Skip workers con problemas de salud
    if (w.type === 'local' && !health.agentsAvailable.length) return false;
    if (w.type === 'ollama' && !health.ollamaOk) return false;

    return true;
  });

  // Scoring basado en budget
  const scoredWorkers = availableWorkers.map((worker) => {
    let score = 100 - worker.priority; // base score

    // Budget adjustment
    if (criteria.budget === 'low') {
      // Preferir workers gratuitos
      if (worker.costPerToken === 0) score += 50;
      else score -= 50;
    } else if (criteria.budget === 'high') {
      // Preferir workers más potentes
      score += (worker.maxTokens || 0) / 10000;
    }

    // Preferred worker bonus
    if (criteria.preferredWorker && worker.type === criteria.preferredWorker) {
      score += 100;
    }

    // Capacity-based adjustment
    if (worker.type === 'ollama' && health.ollamaOk && health.warnings.length === 0) {
      score += 20;
    }

    return { worker, score };
  });

  // Sort by score
  scoredWorkers.sort((a, b) => b.score - a.score);

  const selected = scoredWorkers[0];
  const fallback = scoredWorkers.slice(1).map((s) => s.worker);

  // Generate reason
  const reason = generateReason(selected.worker, criteria, health);

  return {
    worker: selected.worker,
    reason,
    fallbackWorkers: fallback,
  };
}

/**
 * Generar descripción de por qué se eligió este worker
 */
function generateReason(
  worker: WorkerConfig,
  criteria: SelectionCriteria,
  health: HealthCheckResult
): string {
  switch (worker.type) {
    case 'local':
      if (health.agentsAvailable.includes('cursor')) {
        return `Cursor available locally (free, low latency)`;
      }
      return `Local agent ${health.agentsAvailable[0] || 'available'} (free, low latency)`;

    case 'ollama':
      return `Ollama running locally (free, no API calls)`;

    case 'worker-mac2011':
      return `Mac 2011 worker (low cost, same network)`;

    case 'vps':
      return `VPS worker (fallback from local)`;

    case 'remote':
      return `Cloud LLM (fallback when local unavailable)`;

    default:
      return `Default selection for budget: ${criteria.budget}`;
  }
}

/**
 * Select worker con retry automático
 */
export async function selectWorkerWithFallback(
  criteria: SelectionCriteria
): Promise<{ worker: WorkerConfig; result: SelectionResult }> {
  const result = await selectWorker(criteria);

  // Si el worker falla, intentar el siguiente
  // Esto se maneja en el executor con retry

  return { worker: result.worker, result };
}

export default { selectWorker, selectWorkerWithFallback };
