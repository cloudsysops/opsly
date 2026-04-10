import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  SprintRow,
  SprintRowStatus,
  SprintStepJson,
  SprintStepStatus,
} from "./sprint-types.js";

function requireSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      "SprintManager requiere SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let client: SupabaseClient | null = null;

export function getSprintSupabase(): SupabaseClient {
  if (!client) {
    client = requireSupabase();
  }
  return client;
}

export async function insertSprint(params: {
  readonly tenantId: string;
  readonly goal: string;
  readonly status: SprintRowStatus;
  readonly steps: readonly SprintStepJson[];
}): Promise<{ id: string }> {
  const sb = getSprintSupabase();
  const { data, error } = await sb
    .schema("platform")
    .from("sprints")
    .insert({
      tenant_id: params.tenantId,
      goal: params.goal,
      status: params.status,
      steps: params.steps as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`insert sprint: ${error?.message ?? "unknown"}`);
  }
  return { id: data.id as string };
}

export async function fetchSprintById(sprintId: string): Promise<SprintRow | null> {
  const sb = getSprintSupabase();
  const { data, error } = await sb
    .schema("platform")
    .from("sprints")
    .select("id, tenant_id, goal, status, steps, created_at, updated_at")
    .eq("id", sprintId)
    .maybeSingle();

  if (error) {
    throw new Error(`fetch sprint: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return parseSprintRow(data);
}

export async function updateSprint(
  sprintId: string,
  patch: {
    readonly status?: SprintRowStatus;
    readonly steps?: readonly SprintStepJson[];
  },
): Promise<void> {
  const sb = getSprintSupabase();
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    body.status = patch.status;
  }
  if (patch.steps !== undefined) {
    body.steps = patch.steps as unknown as Record<string, unknown>;
  }
  const { error } = await sb.schema("platform").from("sprints").update(body).eq("id", sprintId);
  if (error) {
    throw new Error(`update sprint: ${error.message}`);
  }
}

function normalizeStep(raw: unknown): SprintStepJson | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const st = o.status;
  if (st !== "pending" && st !== "running" && st !== "done" && st !== "failed") {
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
    status: st as SprintStepStatus,
    output: o.output,
  };
}

function parseSprintRow(raw: Record<string, unknown>): SprintRow {
  const stepsRaw = raw.steps;
  const steps: SprintStepJson[] = Array.isArray(stepsRaw)
    ? stepsRaw.map(normalizeStep).filter((s): s is SprintStepJson => s !== null)
    : [];

  return {
    id: String(raw.id),
    tenant_id: String(raw.tenant_id),
    goal: String(raw.goal),
    status: raw.status as SprintRowStatus,
    steps,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}
