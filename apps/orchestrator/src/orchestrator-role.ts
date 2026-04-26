/**
 * Separa el proceso en control plane (VPS: TeamManager + eventos, sin consumir colas de trabajo)
 * y worker plane (Mac/remoto: solo BullMQ workers). Por defecto `full` = comportamiento histórico.
 *
 * Ver docs/ARCHITECTURE-DISTRIBUTED.md
 */
export type OrchestratorRole = 'full' | 'control' | 'worker';

/**
 * Alias legible (ADR-020) cuando `OPSLY_ORCHESTRATOR_ROLE` no está definido:
 * - `queue-only` → control (solo encolado / TeamManager, sin workers BullMQ)
 * - `worker-enabled` → worker (solo workers; sin control plane)
 */
function roleFromOrchestratorModeEnv(): OrchestratorRole | null {
  const mode = process.env.OPSLY_ORCHESTRATOR_MODE?.trim().toLowerCase() ?? '';
  if (mode === 'queue-only' || mode === 'queue_only') {
    return 'control';
  }
  if (mode === 'worker-enabled' || mode === 'worker_enabled') {
    return 'worker';
  }
  return null;
}

export function parseOrchestratorRole(): OrchestratorRole {
  const raw = process.env.OPSLY_ORCHESTRATOR_ROLE?.trim().toLowerCase() ?? '';
  if (raw === 'control' || raw === 'dispatch' || raw === 'dispatch-only') {
    return 'control';
  }
  if (raw === 'worker' || raw === 'workers') {
    return 'worker';
  }
  if (raw.length > 0) {
    return 'full';
  }
  const fromMode = roleFromOrchestratorModeEnv();
  if (fromMode !== null) {
    return fromMode;
  }
  return 'full';
}

/** Etiqueta para health checks y logs (no sustituye el rol interno). */
export function orchestratorModeLabel(
  role: OrchestratorRole
): 'queue-only' | 'worker-enabled' | 'full-stack' {
  if (role === 'control') {
    return 'queue-only';
  }
  if (role === 'worker') {
    return 'worker-enabled';
  }
  return 'full-stack';
}

export function shouldRunControlPlane(role: OrchestratorRole): boolean {
  return role === 'control' || role === 'full';
}

export function shouldRunWorkers(role: OrchestratorRole): boolean {
  return role === 'worker' || role === 'full';
}
