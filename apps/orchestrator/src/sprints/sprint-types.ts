/** Paso persistido en `platform.sprints.steps` (jsonb). */
export type SprintStepStatus = "pending" | "running" | "done" | "failed";

export type SprintStepJson = {
  readonly id: string;
  readonly description: string;
  readonly tool_name: string;
  readonly params: Record<string, unknown>;
  readonly status: SprintStepStatus;
  readonly output?: unknown;
};

export type SprintRowStatus = "planning" | "running" | "completed" | "failed";

export type SprintRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly goal: string;
  readonly status: SprintRowStatus;
  readonly steps: SprintStepJson[];
  readonly created_at: string;
  readonly updated_at: string;
};
