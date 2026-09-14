export type GithubQueueMeta = {
  agent?: unknown;
  task_type?: unknown;
  cost_class?: unknown;
};

export type GovernedAgentResolution = {
  workerId: string;
  opslyJobType: string;
  taskType: string;
  provider: string;
  costClass: string;
};

export function resolveGovernedAgent(
  meta: GithubQueueMeta,
  registry: { workers?: Record<string, Record<string, unknown>> },
): GovernedAgentResolution;

export function loadGovernedAgentRegistry(root: string): Promise<{
  workers: Record<string, Record<string, unknown>>;
}>;
