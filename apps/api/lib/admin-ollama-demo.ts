import { randomUUID } from "node:crypto";
import { checkTenantBudget } from "./billing/budget-enforcer";
import { HTTP_STATUS } from "./constants";
import { logger } from "./logger";
import { getServiceClient } from "./supabase";
import type { PlanKey } from "./supabase/types";

const PAYMENT_REQUIRED = 402;

export const ORCHESTRATOR_INTERNAL_URL =
  process.env.ORCHESTRATOR_INTERNAL_URL ?? "http://127.0.0.1:3011";

export function toOrchestratorPlan(
  plan: PlanKey,
): "startup" | "business" | "enterprise" | undefined {
  if (plan === "business") {
    return "business";
  }
  if (plan === "enterprise") {
    return "enterprise";
  }
  if (plan === "startup" || plan === "demo") {
    return "startup";
  }
  return undefined;
}

export async function resolveTenantBySlug(
  slug: string,
): Promise<{ id: string; plan: PlanKey } | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema("platform")
    .from("tenants")
    .select("id, plan")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  const plan = data.plan as PlanKey;
  return { id: data.id as string, plan };
}

export function parseTaskType(
  raw: unknown,
): "analyze" | "generate" | "review" | "summarize" {
  if (
    raw === "analyze" ||
    raw === "generate" ||
    raw === "review" ||
    raw === "summarize"
  ) {
    return raw;
  }
  return "summarize";
}

export async function checkBudgetForOllamaDemo(
  tenantId: string,
  tenantSlug: string,
): Promise<Response | null> {
  try {
    const budget = await checkTenantBudget(tenantId);
    if (budget.isOverBudget && !budget.enforcementSkipped) {
      return Response.json(
        {
          error: "Monthly budget exceeded",
          tenant_slug: tenantSlug,
        },
        { status: PAYMENT_REQUIRED },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      "admin ollama-demo budget check",
      err instanceof Error ? err : new Error(message),
    );
    return Response.json(
      { error: message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
  return null;
}

export type OllamaEnqueueParams = {
  tenantSlug: string;
  tenantId: string;
  taskType: "analyze" | "generate" | "review" | "summarize";
  prompt: string;
  plan: PlanKey;
  requestId: string;
};

async function postEnqueueOllamaRequest(
  adminToken: string,
  params: OllamaEnqueueParams,
): Promise<Response> {
  return fetch(`${ORCHESTRATOR_INTERNAL_URL}/internal/enqueue-ollama`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      tenant_slug: params.tenantSlug,
      tenant_id: params.tenantId,
      task_type: params.taskType,
      prompt: params.prompt,
      plan: toOrchestratorPlan(params.plan),
      request_id: params.requestId,
    }),
  });
}

async function mapEnqueueResponse(
  orchRes: Response,
  requestId: string,
): Promise<Response> {
  const payload: unknown = await orchRes.json().catch(() => null);
  if (!orchRes.ok) {
    const status =
      orchRes.status >= HTTP_STATUS.BAD_REQUEST
        ? orchRes.status
        : HTTP_STATUS.INTERNAL_ERROR;
    return Response.json(
      {
        error: "enqueue failed",
        detail: payload,
      },
      { status },
    );
  }

  return Response.json(
    {
      ok: true,
      request_id: requestId,
      ...(typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {}),
    },
    { status: HTTP_STATUS.CREATED },
  );
}

export async function callOrchestratorEnqueueOllama(
  adminToken: string,
  params: OllamaEnqueueParams,
): Promise<Response> {
  let orchRes: Response;
  try {
    orchRes = await postEnqueueOllamaRequest(adminToken, params);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `orchestrator unreachable: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE },
    );
  }

  return mapEnqueueResponse(orchRes, params.requestId);
}

export function buildOllamaDemoRequestId(): string {
  return randomUUID();
}
