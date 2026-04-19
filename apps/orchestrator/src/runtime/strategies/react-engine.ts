/**
 * Motor ReAct (Reason + Act) del Opsly Agentic Runtime.
 *
 * Transiciones típicas por iteración: `thinking` → (`acting` → `observing`)? → siguiente `thinking`.
 *
 * @see docs/design/OAR.md — §3.1 ReAct Loop
 */

import type { AgentActionPort } from "../interfaces/agent-action-port.js";
import type { MemoryInterface } from "../interfaces/memory.interface.js";
import type { OarTracer } from "../observability/tracer.js";
import { traceOar } from "../observability/tracer.js";
import type { OarLifecycleState } from "../types.js";
import { OAR_LIFECYCLE } from "../types.js";

/** Pasos máximos por defecto (alineado a modos exploratorios en OAR). */
export const DEFAULT_MAX_REACT_STEPS = 50;

/** Modelo por defecto pasado a `complete` si no se especifica en opciones. */
export const DEFAULT_REACT_MODEL = "react-orchestrator-default";

/**
 * Contrato mínimo del cliente LLM Gateway para ReAct (la implementación HTTP vive fuera).
 */
export interface ReActLlmGatewayClient {
  /**
   * Una vuelta de completado: prompt completo (instrucciones + historial) → texto del modelo.
   */
  complete(model: string, prompt: string): Promise<string>;
}

export interface RunReActStrategyResult {
  /** Estado terminal del run. */
  state: Extract<OarLifecycleState, "completed" | "failed">;
  /** Respuesta final si `state === "completed"`. */
  finalAnswer?: string;
  /** Motivo de fallo o límite de pasos. */
  errorMessage?: string;
  /** Iteraciones completadas (incrementos del loop principal). */
  stepsExecuted: number;
  /** Última fase OAR registrada antes de terminar. */
  lastLifecycleState: OarLifecycleState;
}

export interface RunReActStrategyOptions {
  maxSteps?: number;
  model?: string;
  /** Trazas X-Ray (Redis Pub/Sub); opcional. */
  tracer?: OarTracer;
}

type ParsedModelStep =
  | { kind: "final_answer"; answer: string }
  | { kind: "action"; actionName: string; args: Record<string, unknown>; thought?: string }
  | { kind: "parse_error"; message: string };

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return trimmed;
}

/** Expuesto para tests y depuración del formato JSON ReAct. */
export function parseReActModelOutput(raw: string): ParsedModelStep {
  const text = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { kind: "parse_error", message: "Model output is not valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { kind: "parse_error", message: "Model output JSON must be an object." };
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.final_answer === "string") {
    return { kind: "final_answer", answer: obj.final_answer };
  }

  if (typeof obj.action === "string") {
    const argsRaw = obj.args;
    const args =
      typeof argsRaw === "object" && argsRaw !== null && !Array.isArray(argsRaw)
        ? (argsRaw as Record<string, unknown>)
        : {};
    const thought = typeof obj.thought === "string" ? obj.thought : undefined;
    return { kind: "action", actionName: obj.action, args, thought };
  }

  return {
    kind: "parse_error",
    message: 'Expected either "final_answer" (string) or "action" (string) with optional "args" (object).',
  };
}

function buildReActPrompt(initialPrompt: string, transcriptLines: readonly string[]): string {
  const history =
    transcriptLines.length === 0
      ? "(no prior steps)"
      : transcriptLines.map((line, i) => `Step ${i + 1}:\n${line}`).join("\n\n");
  return `${initialPrompt}

Previous steps (thoughts, actions, observations):
${history}

You must respond with a single JSON object only:
- To finish: {"final_answer": "<string>"}
- To call a tool: {"action": "<tool_name>", "args": {<arguments>}, "thought": "<optional reasoning>"}`;
}

function formatContextPrefix(context: Record<string, unknown>): string {
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return "[unserializable working context]";
  }
}

/**
 * Ejecuta la estrategia ReAct: piensa (LLM) → opcionalmente actúa (puerto) → observa → recuerda.
 */
export async function runReActStrategy(
  tenantSlug: string,
  sessionId: string,
  initialPrompt: string,
  actionPort: AgentActionPort,
  memory: MemoryInterface,
  llmGatewayClient: ReActLlmGatewayClient,
  options?: RunReActStrategyOptions,
): Promise<RunReActStrategyResult> {
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_REACT_STEPS;
  const model = options?.model ?? DEFAULT_REACT_MODEL;
  const tracer = options?.tracer;

  traceOar(tracer, sessionId, tenantSlug, "strategy_start", { type: "react" });

  const working = await memory.getWorkingContext(tenantSlug, sessionId);
  const contextBlock =
    Object.keys(working).length > 0
      ? `Working context (from memory):\n${formatContextPrefix(working)}\n\n`
      : "";

  const transcriptLines: string[] = [];
  let stepIndex = 0;

  for (let iter = 0; iter < maxSteps; iter += 1) {
    // THINKING → siguiente thought + acción o respuesta final
    const prompt = contextBlock + buildReActPrompt(initialPrompt, transcriptLines);
    const raw = await llmGatewayClient.complete(model, prompt);

    const parsed = parseReActModelOutput(raw);

    traceOar(tracer, sessionId, tenantSlug, "llm_call", {
      stepIndex,
      iteration: iter,
      model,
      outcome: parsed.kind,
      thought: parsed.kind === "action" ? parsed.thought : undefined,
      input: prompt,
      output: raw,
    });

    if (parsed.kind === "parse_error") {
      const note = `[parse_error] ${parsed.message} Raw (truncated): ${raw.slice(0, 500)}`;
      await memory.appendObservation(tenantSlug, sessionId, stepIndex, note);
      transcriptLines.push(`Thought: (parse failed)\nObservation: ${note}`);
      stepIndex += 1;
      continue;
    }

    if (parsed.kind === "final_answer") {
      traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
        state: "completed",
        stepsExecuted: stepIndex + 1,
        lastLifecycleState: OAR_LIFECYCLE.completed,
      });
      return {
        state: "completed",
        finalAnswer: parsed.answer,
        stepsExecuted: stepIndex + 1,
        lastLifecycleState: OAR_LIFECYCLE.completed,
      };
    }

    // ACTING → OBSERVING → REMEMBERING
    const thoughtLine = parsed.thought ? `Thought: ${parsed.thought}\n` : "";
    const toolResult = await actionPort.executeAction(tenantSlug, parsed.actionName, parsed.args);

    const observationText = toolResult.success
      ? toolResult.observation
      : `[action error] ${toolResult.error ?? "unknown error"}. Observation: ${toolResult.observation}`;

    traceOar(tracer, sessionId, tenantSlug, "tool_call", {
      toolName: parsed.actionName,
      args: parsed.args,
      stepIndex,
      input: parsed.args,
      toolResult: observationText,
    });

    await memory.appendObservation(tenantSlug, sessionId, stepIndex, observationText);

    transcriptLines.push(
      `${thoughtLine}Action: ${parsed.actionName} ${JSON.stringify(parsed.args)}\nObservation: ${observationText}`,
    );
    stepIndex += 1;
  }

  traceOar(tracer, sessionId, tenantSlug, "strategy_end", {
    state: "failed",
    stepsExecuted: stepIndex,
    lastLifecycleState: OAR_LIFECYCLE.failed,
    errorMessage: `ReAct exceeded maximum steps (${maxSteps}) without final_answer.`,
  });
  return {
    state: "failed",
    errorMessage: `ReAct exceeded maximum steps (${maxSteps}) without final_answer.`,
    stepsExecuted: stepIndex,
    lastLifecycleState: OAR_LIFECYCLE.failed,
  };
}
