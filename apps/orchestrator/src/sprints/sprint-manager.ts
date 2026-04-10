import { createDefaultToolRegistry } from "../agents/tools/registry.js";
import { buildPlannerContextSnapshot } from "../planner-map.js";
import { executeRemotePlanner } from "../planner-client.js";
import type { IntentRequest, PlannerAction } from "../types.js";
import { fetchSprintById, insertSprint, updateSprint } from "./sprint-repository.js";
import type { SprintRow, SprintStepJson } from "./sprint-types.js";

export type CreateSprintParams = {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly goal: string;
  readonly requestId: string;
  readonly plan?: IntentRequest["plan"];
  readonly intentRequest: IntentRequest;
};

function actionsToSteps(actions: PlannerAction[]): SprintStepJson[] {
  return actions.map((a, i) => ({
    id: `step-${i + 1}`,
    description: `${a.tool}: ${JSON.stringify(a.params)}`,
    tool_name: a.tool,
    params: a.params,
    status: "pending" as const,
  }));
}

function fallbackSteps(): SprintStepJson[] {
  return [
    {
      id: "step-1",
      description: "dummy_square: validación mínima del pipeline",
      tool_name: "dummy_square",
      params: { value: 2 },
      status: "pending",
    },
  ];
}

/**
 * Planificación (LLM vía gateway, sesgo cost / planner rápido) + ejecución paso a paso con ToolRegistry.
 */
export class SprintManager {
  async createSprint(params: CreateSprintParams): Promise<{ sprintId: string }> {
    const toolRegistry = createDefaultToolRegistry();
    const snapshot = buildPlannerContextSnapshot(params.intentRequest);
    const tools = toolRegistry.listToolNames();
    const contextStr = JSON.stringify(
      {
        ...snapshot,
        sprint_goal: params.goal,
        instruction:
          "Genera un plan LINEAL corto (máx. 6 acciones). Cada acción usa exactamente un nombre de herramienta de la lista.",
      },
      null,
      2,
    );

    const gw = await executeRemotePlanner(contextStr, tools, {
      tenantSlug: params.tenantSlug,
      requestId: params.requestId,
      tenantPlan: params.plan,
    });

    const steps =
      gw.planner.actions.length > 0
        ? actionsToSteps(gw.planner.actions)
        : fallbackSteps();

    const { id } = await insertSprint({
      tenantId: params.tenantId,
      goal: params.goal,
      status: "planning",
      steps,
    });

    return { sprintId: id };
  }

  async executeSprint(sprintId: string): Promise<void> {
    const row = await fetchSprintById(sprintId);
    if (!row) {
      return;
    }

    const toolRegistry = createDefaultToolRegistry();
    let steps: SprintStepJson[] = [...row.steps];

    await updateSprint(sprintId, { status: "running", steps });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) {
        continue;
      }

      steps[i] = { ...step, status: "running" };
      await updateSprint(sprintId, { steps, status: "running" });

      const tool = toolRegistry.get(step.tool_name);
      if (!tool) {
        steps[i] = {
          ...step,
          status: "failed",
          output: { ok: false, error: "unknown_tool" },
        };
        await updateSprint(sprintId, { steps, status: "failed" });
        return;
      }

      try {
        const out = await tool.execute(step.params);
        steps[i] = {
          ...step,
          status: "done",
          output: out,
        };
        await updateSprint(sprintId, { steps, status: "running" });
      } catch (err) {
        steps[i] = {
          ...step,
          status: "failed",
          output: {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          },
        };
        await updateSprint(sprintId, { steps, status: "failed" });
        return;
      }
    }

    await updateSprint(sprintId, { status: "completed", steps });
  }
}

export type { SprintRow };
