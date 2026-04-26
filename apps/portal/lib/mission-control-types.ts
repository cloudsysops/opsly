/** Estados de paso alineados al orchestrator / Supabase. */
export type SprintStepStatus = 'pending' | 'running' | 'done' | 'failed';

export type ApiSprintStep = {
  readonly id: string;
  readonly description: string;
  readonly tool_name: string;
  readonly status: SprintStepStatus;
  readonly output?: unknown;
};

export type ApiSprint = {
  readonly id: string;
  readonly goal: string;
  readonly status: 'planning' | 'running' | 'completed' | 'failed';
  readonly steps: readonly ApiSprintStep[];
  readonly created_at: string;
  readonly updated_at: string;
};

export type ActiveSprintsPayload = {
  readonly sprints: readonly ApiSprint[];
  readonly generated_at: string;
};

/** Avatar 3D (derivado de `ApiSprint`). */
export type SprintAgentStatus = 'idle' | 'working' | 'error';

export type ActiveSprint = {
  readonly id: string;
  readonly name: string;
  readonly status: SprintAgentStatus;
  readonly currentStep: string;
  readonly output: string;
  readonly steps: readonly string[];
};

export function apiSprintToAvatar(s: ApiSprint): ActiveSprint {
  const running = s.steps.find((st) => st.status === 'running');
  const failed = s.steps.find((st) => st.status === 'failed');
  const currentStep =
    running?.description ?? failed?.description ?? s.steps[s.steps.length - 1]?.description ?? '—';
  let status: SprintAgentStatus = 'idle';
  if (s.status === 'failed' || failed) {
    status = 'error';
  } else if (s.status === 'running' || running) {
    status = 'working';
  }
  const outputPreview = (() => {
    try {
      const t = JSON.stringify(
        s.steps.map((x) => ({ tool: x.tool_name, st: x.status })),
        null,
        0
      );
      return t.length > 400 ? `${t.slice(0, 397)}…` : t;
    } catch {
      return '';
    }
  })();
  return {
    id: s.id,
    name: s.goal.length > 90 ? `${s.goal.slice(0, 87)}…` : s.goal,
    status,
    currentStep,
    output: outputPreview,
    steps: s.steps.map((x) => x.description || x.tool_name),
  };
}
