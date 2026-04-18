/**
 * Capa de reflexión (meta-crítica) del Opsly Agentic Runtime: envuelve estrategias primarias
 * y puede re-ejecutarlas tras feedback del revisor LLM.
 *
 * @see docs/design/OAR.md — §3.3 Reflection Loop
 */

import { z } from "zod";

import type { AgentActionPort } from "../interfaces/agent-action-port.js";
import type { MemoryInterface } from "../interfaces/memory.interface.js";
import { OAR_LIFECYCLE } from "../types.js";

import type { RunPlanExecuteResult } from "./plan-execute-engine.js";
import {
  DEFAULT_REACT_MODEL,
  type ReActLlmGatewayClient,
  type RunReActStrategyResult,
} from "./react-engine.js";

/** Resultado terminal común a ReAct y Plan & Execute (extensible). */
export type StrategyTerminalResult = RunReActStrategyResult | RunPlanExecuteResult;

export interface ReflectionOptions {
  /** Máximo de re-ejecuciones de la estrategia primaria tras un `fail` del revisor (no cuenta el intento inicial). */
  maxReflections: number;
  /** Modelo para la llamada de crítica; si se omite, se usa {@link DEFAULT_REACT_MODEL}. */
  critiqueModel?: string;
}

/** Contexto compartido con las estrategias primarias (el `actionPort` lo usa el runner vía closure). */
export interface ReflectionRunContext {
  tenantSlug: string;
  sessionId: string;
  initialPrompt: string;
  actionPort: AgentActionPort;
  memory: MemoryInterface;
  llmGatewayClient: ReActLlmGatewayClient;
}

/** Construye {@link ReflectionRunContext} con los mismos campos que las estrategias ReAct / Plan & Execute. */
export function createReflectionContext(
  tenantSlug: string,
  sessionId: string,
  initialPrompt: string,
  actionPort: AgentActionPort,
  memory: MemoryInterface,
  llmGatewayClient: ReActLlmGatewayClient,
): ReflectionRunContext {
  return { tenantSlug, sessionId, initialPrompt, actionPort, memory, llmGatewayClient };
}

export type PrimaryStrategyRunner<T extends StrategyTerminalResult> = (
  initialPrompt: string,
) => Promise<T>;

const CritiqueResponseSchema = z.discriminatedUnion("verdict", [
  z.object({ verdict: z.literal("pass") }),
  z.object({ verdict: z.literal("fail"), reason: z.string() }),
]);

type CritiqueResponse = z.infer<typeof CritiqueResponseSchema>;

const REFLECTION_MEMORY_OFFSET = 9000;

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return trimmed;
}

function parseCritiqueResponse(raw: string): { ok: true; value: CritiqueResponse } | { ok: false; message: string } {
  const text = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : unknownToBriefString(e);
    return { ok: false, message: `Critique JSON.parse failed: ${msg}` };
  }
  const out = CritiqueResponseSchema.safeParse(parsed);
  if (!out.success) {
    return { ok: false, message: out.error.message };
  }
  return { ok: true, value: out.data };
}

function unknownToBriefString(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return "non-serializable error";
    }
  }
  if (typeof err === "bigint") {
    return err.toString();
  }
  if (typeof err === "symbol") {
    return err.toString();
  }
  if (typeof err === "function") {
    return `[function ${err.name}]`;
  }
  if (typeof err === "number" || typeof err === "boolean") {
    return String(err);
  }
  if (err === undefined) {
    return "undefined";
  }
  return "unknown";
}

function buildCritiquePrompt(originalTask: string, candidateAnswer: string): string {
  return `You are an expert reviewer. Review the candidate answer for logical errors, security vulnerabilities, or deviation from the user's request.

Original task:
${originalTask}

Candidate answer:
${candidateAnswer}

Respond with a single JSON object only:
- If the answer is acceptable: {"verdict":"pass"}
- If it needs fixes: {"verdict":"fail","reason":"<concise explanation>"}`;
}

function augmentPromptForRetry(basePrompt: string, critiqueReason: string): string {
  return `${basePrompt}

---
The previous attempt was rejected by an automated reviewer. Address the following:
${critiqueReason}`;
}

function strategyFailureFromCrash<T extends StrategyTerminalResult>(err: unknown): T {
  const msg = unknownToBriefString(err);
  return {
    state: "failed",
    errorMessage: `Primary strategy crashed: ${msg}`,
    stepsExecuted: 0,
    lastLifecycleState: OAR_LIFECYCLE.failed,
  } as T;
}

function maxReflectionsFailure<T extends StrategyTerminalResult>(last: T): T {
  return {
    ...last,
    state: "failed",
    errorMessage: "Max reflections reached without reviewer pass.",
    lastLifecycleState: OAR_LIFECYCLE.failed,
  } as T;
}

type ReflectionLoopControl<T extends StrategyTerminalResult> =
  | { action: "return"; value: T }
  | { action: "retry"; nextPrompt: string };

interface ReflectionRoundParams<T extends StrategyTerminalResult> {
  primaryStrategyFunction: PrimaryStrategyRunner<T>;
  currentPrompt: string;
  initialPrompt: string;
  tenantSlug: string;
  sessionId: string;
  reflectionRound: number;
  maxRetries: number;
  critiqueModel: string;
  memory: MemoryInterface;
  llmGatewayClient: ReActLlmGatewayClient;
}

async function runOneReflectionRound<T extends StrategyTerminalResult>(
  p: ReflectionRoundParams<T>,
): Promise<ReflectionLoopControl<T>> {
  let result: T;
  try {
    result = await p.primaryStrategyFunction(p.currentPrompt);
  } catch (err) {
    return { action: "return", value: strategyFailureFromCrash<T>(err) };
  }

  if (result.state === "failed") {
    return { action: "return", value: result };
  }

  const answer = result.finalAnswer;
  if (answer === undefined || answer.trim() === "") {
    return { action: "return", value: result };
  }

  const critiquePrompt = buildCritiquePrompt(p.initialPrompt, answer);
  const critiqueRaw = await p.llmGatewayClient.complete(p.critiqueModel, critiquePrompt);
  const parsed = parseCritiqueResponse(critiqueRaw);

  if (!parsed.ok) {
    const note = `[reflection] Critique parse failed: ${parsed.message}. Raw (truncated): ${critiqueRaw.slice(0, 400)}`;
    await p.memory.appendObservation(p.tenantSlug, p.sessionId, REFLECTION_MEMORY_OFFSET + p.reflectionRound, note);
    if (p.reflectionRound >= p.maxRetries) {
      return { action: "return", value: maxReflectionsFailure(result) };
    }
    return { action: "retry", nextPrompt: augmentPromptForRetry(p.initialPrompt, note) };
  }

  if (parsed.value.verdict === "pass") {
    return { action: "return", value: result };
  }

  const reason = parsed.value.reason;
  await p.memory.appendObservation(
    p.tenantSlug,
    p.sessionId,
    REFLECTION_MEMORY_OFFSET + p.reflectionRound,
    `[reflection] Reviewer rejected output: ${reason}`,
  );

  if (p.reflectionRound >= p.maxRetries) {
    return { action: "return", value: maxReflectionsFailure(result) };
  }

  return { action: "retry", nextPrompt: augmentPromptForRetry(p.initialPrompt, reason) };
}

/**
 * Ejecuta una estrategia primaria y, si termina en `completed`, la somete a un revisor LLM
 * hasta `maxReflections` reintentos o `pass`.
 *
 * Si la estrategia devuelve `failed` o lanza, no se intenta corrección por reflexión.
 */
export async function runWithReflection<T extends StrategyTerminalResult>(
  primaryStrategyFunction: PrimaryStrategyRunner<T>,
  ctx: ReflectionRunContext,
  options: ReflectionOptions,
): Promise<T> {
  const critiqueModel = options.critiqueModel ?? DEFAULT_REACT_MODEL;
  const maxRetries = Math.max(0, options.maxReflections);
  const { tenantSlug, sessionId, initialPrompt, memory, llmGatewayClient } = ctx;

  let currentPrompt = initialPrompt;

  for (let reflectionRound = 0; reflectionRound <= maxRetries; reflectionRound += 1) {
    const step = await runOneReflectionRound({
      primaryStrategyFunction,
      currentPrompt,
      initialPrompt,
      tenantSlug,
      sessionId,
      reflectionRound,
      maxRetries,
      critiqueModel,
      memory,
      llmGatewayClient,
    });

    if (step.action === "return") {
      return step.value;
    }

    currentPrompt = step.nextPrompt;
  }

  throw new Error("runWithReflection: unexpected exit");
}
