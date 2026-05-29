import type { RouteContext } from '../router.js';
import { errorResponse, jsonResponse } from '../router.js';
import { parseBody } from '../utils.js';
import {
  buildPoppingSubagentPlan,
  getPoppingSubagentCatalog,
} from '../../lib/popping-subagents.js';

type PoppingSubagentsPlanRequest = {
  goal?: string;
  tenant_slug?: string;
  tenantSlug?: string;
  branch_name?: string;
  branchName?: string;
  session_id?: string;
  sessionId?: string;
  files_touched?: string[];
  filesTouched?: string[];
};

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readFiles(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const files = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  return files.length > 0 ? files : undefined;
}

export async function handleRuntimePoppingSubagents(ctx: RouteContext): Promise<void> {
  if (ctx.req.method === 'GET') {
    jsonResponse(ctx.res, 200, {
      ok: true,
      generated_at: new Date().toISOString(),
      catalog: getPoppingSubagentCatalog(),
    });
    return;
  }

  if (ctx.req.method !== 'POST') {
    errorResponse(ctx.res, 405, 'method not allowed');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const request = body as PoppingSubagentsPlanRequest;
  const goal = readString(request.goal);
  if (!goal) {
    errorResponse(ctx.res, 400, 'goal required');
    return;
  }

  const plan = await buildPoppingSubagentPlan({
    goal,
    tenantSlug: readString(request.tenant_slug) ?? readString(request.tenantSlug),
    branchName: readString(request.branch_name) ?? readString(request.branchName),
    sessionId: readString(request.session_id) ?? readString(request.sessionId),
    filesTouched: readFiles(request.files_touched) ?? readFiles(request.filesTouched),
  });

  jsonResponse(ctx.res, 200, {
    ok: true,
    generated_at: new Date().toISOString(),
    plan,
  });
}
