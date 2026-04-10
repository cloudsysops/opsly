import { getServiceClient } from "../../../../lib/supabase/client";
import { resolveTrustedPortalSession } from "../../../../lib/portal-trusted-identity";
import type { SprintStepJson } from "../../../../lib/sprints/sprint-types";

export const runtime = "nodejs";

type SprintRowDb = {
  readonly id: string;
  readonly goal: string;
  readonly status: "planning" | "running" | "completed" | "failed";
  readonly steps: unknown;
  readonly created_at: string;
  readonly updated_at: string;
};

export type ActiveSprintApi = {
  readonly id: string;
  readonly goal: string;
  readonly status: SprintRowDb["status"];
  readonly steps: SprintStepJson[];
  readonly created_at: string;
  readonly updated_at: string;
};

const VALID_STATUSES = ["pending", "running", "done", "failed"] as const;
const DEFAULT_LIMIT = 25;

function isValidStatus(status: unknown): status is typeof VALID_STATUSES[number] {
  return typeof status === "string" && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number]);
}

function parseStepItem(item: unknown): SprintStepJson | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }
  const o = item as Record<string, unknown>;
  if (!isValidStatus(o.status)) {
    return null;
  }
  const params =
    typeof o.params === "object" && o.params !== null && !Array.isArray(o.params)
      ? (o.params as Record<string, unknown>)
      : {};
  return {
    id: String(o.id ?? ""),
    description: String(o.description ?? ""),
    tool_name: String(o.tool_name ?? ""),
    params,
    status: o.status,
    output: o.output,
  };
}

function normalizeSteps(raw: unknown): SprintStepJson[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SprintStepJson[] = [];
  for (const item of raw) {
    const step = parseStepItem(item);
    if (step !== null) {
      out.push(step);
    }
  }
  return out;
}

export async function GET(request: Request): Promise<Response> {
  const sessionOut = await resolveTrustedPortalSession(request);
  if (!sessionOut.ok) {
    return sessionOut.response;
  }

  const tenantId = sessionOut.session.tenant.id;
  const sb = getServiceClient();
  const { data, error } = await sb
    .schema("platform")
    .from("sprints")
    .select("id, goal, status, steps, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .in("status", ["planning", "running"])
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_LIMIT);

  if (error) {
    return Response.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as SprintRowDb[];
  const sprints: ActiveSprintApi[] = rows.map((r) => ({
    id: r.id,
    goal: r.goal,
    status: r.status,
    steps: normalizeSteps(r.steps),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return Response.json({
    sprints,
    generated_at: new Date().toISOString(),
  });
}
