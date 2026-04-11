/**
 * Separa el proceso en control plane (VPS: TeamManager + eventos, sin consumir colas de trabajo)
 * y worker plane (Mac/remoto: solo BullMQ workers). Por defecto `full` = comportamiento histórico.
 *
 * Ver docs/ARCHITECTURE-DISTRIBUTED.md
 */
export type OrchestratorRole = "full" | "control" | "worker";

export function parseOrchestratorRole(): OrchestratorRole {
  const raw = process.env.OPSLY_ORCHESTRATOR_ROLE?.trim().toLowerCase() ?? "";
  if (raw === "control" || raw === "dispatch" || raw === "dispatch-only") {
    return "control";
  }
  if (raw === "worker" || raw === "workers") {
    return "worker";
  }
  return "full";
}

export function shouldRunControlPlane(role: OrchestratorRole): boolean {
  return role === "control" || role === "full";
}

export function shouldRunWorkers(role: OrchestratorRole): boolean {
  return role === "worker" || role === "full";
}
