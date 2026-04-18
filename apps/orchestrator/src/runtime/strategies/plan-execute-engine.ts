/**
 * Motor Plan & Execute del Opsly Agentic Runtime: plan JSON → ejecución secuencial → síntesis.
 *
 * @see docs/design/OAR.md — §3.2 Plan & Execute
 */

import { z } from "zod";

import type { AgentActionPort } from "../interfaces/agent-action-port.js";
import type { MemoryInterface } from "../interfaces/memory.interface.js";
import type { OarTracer } from "../observability/tracer.js";
import { traceOar } from "../observability/tracer.js";
import type { OarLifecycleState } from "../types.js";
import { OAR_LIFECYCLE } from "../types.js";

import type { ReActLlmGatewayClient } from "./react-engine.js";

/** Máximo de pasos del plan que se ejecutarán (protección ante arrays enormes). */
export const DEFAULT_MAX_PLAN_STEPS = 50;

/** Reintentos pidiendo al LLM que corrija el JSON del plan tras parse/validación fallidos. */
export const DEFAULT_MAX_PLAN_PARSE_RETRIES = 3;

export const DEFAULT_PLAN_EXECUTE_MODEL = "plan-execute-orchestrator-default";

export interface RunPlanExecuteStrategyOptions {
  model?: string;
  /** Reintentos de planificación tras JSON inválido (default: {@link DEFAULT_MAX_PLAN_PARSE_RETRIES}). */
  maxPlanParseRetries?: number;
  /** Tope de elementos del array de pasos ejecutados (default: {@link DEFAULT_MAX_PLAN_STEPS}). */
  maxPlanSteps?: number;
  /** Trazas X-Ray (Redis Pub/Sub); opcional. */
  tracer?: OarTracer;
}

export interface RunPlanExecuteResult {
  state: Extract<OarLifecycleState, "completed" | "failed">;
  finalAnswer?: string;
  errorMessage?: string;
  /** Pasos de acción ejecutados con éxito (no incluye planning/síntesis). */
  stepsExecuted: number;
  lastLifecycleState: OarLifecycleState;
  /** Pasos válidos en el plan ejecutado (si hubo éxito o fallo durante ejecución). */
  planStepCount?: number;
}

const PlanStepSchema = z.object({
  stepId: z.number().int().positive(),
  action: z.string().min(1),
  thought: z.string().optional(),
  args: z.record(z.unknown()).default({}),
});

const PlanArraySchema = z.array(PlanStepSchema).min(1);

export type PlanStep = z.infer<typeof PlanStepSchema>;

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return trimmed;
}

function formatContextPrefix(context: Record<string, unknown>): string {
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return "[unserializable working context]";
  }
}

function buildPlanningPrompt(initialPrompt: string, correction?: string): string {
  const schemaHint = `The JSON must be a single array. Each element must be an object with:
- "stepId": positive integer (execution order)
- "action": non-empty string (tool name)
- "thought": optional string (why this step)
- "args": object (arguments; use {} if none)

Example:
[{"stepId":1,"action":"fs_read","thought":"read config","args":{"path":"/x"}}]`;

  const base = `${initialPrompt}

You are in PLANNING mode. Output ONLY valid JSON: an array of steps. No markdown fences, no commentary outside the JSON.
${schemaHint}`;

  if (correction === undefined) {
    return base;
  }

  return `${base}

Your previous output was invalid or could not be validated. Fix it and output ONLY the corrected JSON array.

Validation / parse error:
${correction}`;
}

function buildSynthesisPrompt(initialPrompt: string, executionLog: readonly string[]): string {
  const logText =
    executionLog.length === 0
      ? "(no steps executed)"
      : executionLog.map((line, i) => `${i + 1}. ${line}`).join("\n");

  return `${initialPrompt}

Execution log (step results):
${logText}

SYNTHESIS: Write a concise final summary in plain language of what was done and the outcomes. Respond with text only (no JSON).`;
}

/** Expuesto para tests: sanea fences y valida con Zod antes de ejecutar acciones. */
export function parseAndValidatePlan(raw: string): { ok: true; plan: PlanStep[] } | { ok: false; message: string } {
  const text = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `JSON.parse failed: ${msg}` };
  }

  const validated = PlanArraySchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      message: validated.error.flatten().formErrors.join("; ") || validated.error.message,
    };
  }

  const sorted = [...validated.data].sort((a, b) => a.stepId - b.stepId);
  return { ok: true, plan: sorted };
}

function sanitizeStepArgs(args: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(args);
}

async function persistPlanSummary(
  memory: MemoryInterface,
  tenantSlug: string,
  sessionId: string,
  steps: readonly PlanStep[],
): Promise<void> {
  const summary = steps.map((s) => ({ stepId: s.stepId, action: s.action, thought: s.thought }));
  await memory.appendObservation(tenantSlug, sessionId, 0, `[plan] ${JSON.stringify(summary)}`);
}

async function executePlanSteps(
  tenantSlug: string,
  sessionId: string,
  steps: readonly PlanStep[],
  actionPort: AgentActionPort,
  memory: MemoryInterface,
  tracer: OarTracer | undefined,
): Promise<
  | { ok: true; executionLog: string[] }
  | { ok: false; result: RunPlanExecuteResult }
> {
  const executionLog: string[] = [];
  let stepMemoryIndex = 1;

  for (const step of steps) {
    let args: Record<string, unknown>;
    try {
      args = sanitizeStepArgs(step.args);
    } catch {
      return {
        ok: false,
        result: {
          state: "failed",
          errorMessage: `Step ${String(step.stepId)}: args are not serializable.`,
          stepsExecuted: executionLog.length,
          lastLifecycleState: OAR_LIFECYCLE.failed,
          planStepCount: steps.length,
        },
      };
    }

    traceOar(tracer, sessionId, tenantSlug, "tool_call", {
      stepId: step.stepId,
      toolName: step.action,
      args,
    });
    const toolResult = await actionPort.executeAction(tenantSlug, step.action, args);
    const line = `stepId=${String(step.stepId)} action=${step.action} success=${String(toolResult.success)} observation=${toolResult.observation}`;
    executionLog.push(line);
    await memory.appendObservation(tenantSlug, sessionId, stepMemoryIndex, toolResult.observation);
    stepMemoryIndex += 1;

    if (!toolResult.success) {
      return {
        ok: false,
        result: {
          state: "failed",
          errorMessage: `Step ${String(step.stepId)} (${step.action}) failed: ${toolResult.error ?? toolResult.observation}`,
          stepsExecuted: executionLog.length,
          lastLifecycleState: OAR_LIFECYCLE.failed,
          planStepCount: steps.length,
        },
      };
    }
  }

  return { ok: true, executionLog };
}

/**
 * Plan & Execute: una llamada de planificación (JSON), ejecución ordenada de pasos, síntesis final.
 */
export async function runPlanExecuteStrategy(
  tenantSlug: string,
  sessionId: string,
  initialPrompt: string,
  actionPort: AgentActionPort,
  memory: MemoryInterface,
  llmGatewayClient: ReActLlmGatewayClient,
  options?: RunPlanExecuteStrategyOptions,
): Promise<RunPlanExecuteResult> {
  const model = options?.model ?? DEFAULT_PLAN_EXECUTE_MODEL;
  const maxParseRetries = options?.maxPlanParseRetries ?? DEFAULT_MAX_PLAN_PARSE_RETRIES;
  const maxPlanSteps = Math.max(0, options?.maxPlanSteps ?? DEFAULT_MAX_PLAN_STEPS);
  const tracer = options?.tracer;

  traceOar(tracer, sessionId, tenantSlug, "strategy_start", { type: "plan_execute" });

  const working = await memory.getWorkingContext(tenantSlug, sessionId);
  const contextBlock =
    Object.keys(working).length > 0
      ? `Working context (from memory):\n${formatContextPrefix(working)}\n\n`
      : "";

  let planRaw = "";
  let lastParseError = "";

  for (let attempt = 0; attempt < maxParseRetries; attempt += 1) {
    const planningPrompt =
      contextBlock +
      buildPlanningPrompt(initialPrompt, attempt === 0 ? undefined : lastParseError);

    planRaw = await llmGatewayClient.complete(model, planningPrompt);
    const parsed = parseAndValidatePlan(planRaw);

    if (!parsed.ok) {
      lastParseError = `${parsed.message}\nRaw (truncated): ${planRaw.slice(0, 800)}`;
      continue;
    }

    const capped = parsed.plan.slice(0, maxPlanSteps);
    if (capped.length === 0) {
      traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
        state: "failed",
        errorMessage: "Plan is empty after applying maxPlanSteps.",
      });
      return {
        state: "failed",
        errorMessage: "Plan is empty after applying maxPlanSteps.",
        stepsExecuted: 0,
        lastLifecycleState: OAR_LIFECYCLE.failed,
        planStepCount: 0,
      };
    }

    traceOar(tracer, sessionId, tenantSlug, "llm_call", {
      phase: "planning",
      stepsCount: capped.length,
      attempt,
    });

    await persistPlanSummary(memory, tenantSlug, sessionId, capped);

    const ran = await executePlanSteps(tenantSlug, sessionId, capped, actionPort, memory, tracer);
    if (!ran.ok) {
      traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
        state: ran.result.state,
        stepsExecuted: ran.result.stepsExecuted,
        planStepCount: ran.result.planStepCount,
        errorMessage: ran.result.errorMessage,
      });
      return ran.result;
    }

    traceOar(tracer, sessionId, tenantSlug, "llm_call", { phase: "synthesis" });
    const synthesisPrompt = contextBlock + buildSynthesisPrompt(initialPrompt, ran.executionLog);
    const synthesisRaw = await llmGatewayClient.complete(model, synthesisPrompt);
    const finalAnswer = stripCodeFences(synthesisRaw).trim();

    traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
      state: "completed",
      stepsExecuted: ran.executionLog.length,
      planStepCount: capped.length,
    });
    return {
      state: "completed",
      finalAnswer,
      stepsExecuted: ran.executionLog.length,
      lastLifecycleState: OAR_LIFECYCLE.completed,
      planStepCount: capped.length,
    };
  }

  traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
    state: "failed",
    errorMessage: `Could not obtain a valid plan after ${String(maxParseRetries)} attempt(s).`,
  });
  return {
    state: "failed",
    errorMessage: `Could not obtain a valid plan after ${String(maxParseRetries)} attempt(s). Last error: ${lastParseError}`,
    stepsExecuted: 0,
    lastLifecycleState: OAR_LIFECYCLE.failed,
  };
}
