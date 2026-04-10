/** Copiado conceptualmente del orchestrator — contrato HTTP Mission Control. */
export type SprintStepStatus = "pending" | "running" | "done" | "failed";

export type SprintStepJson = {
  readonly id: string;
  readonly description: string;
  readonly tool_name: string;
  readonly params: Record<string, unknown>;
  readonly status: SprintStepStatus;
  readonly output?: unknown;
};
