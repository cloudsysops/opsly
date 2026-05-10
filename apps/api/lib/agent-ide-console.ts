import { HTTP_STATUS } from './constants';
import { ORCHESTRATOR_INTERNAL_URL } from './admin-ollama-demo';

export type AgentIdeTerminalStartBody = {
  agent_id?: string;
  tenant_slug?: string;
  session_id?: string;
  process_label?: string;
  objective?: string;
  commands?: string[];
  timeout_seconds?: number;
  cwd?: string;
};

type AgentIdeMcpRole = 'admin' | 'portal';
type AgentIdeMcpTool = {
  id: string;
  label: string;
  mode: 'read-only' | 'action';
  roles: AgentIdeMcpRole[];
  description: string;
};

export const AGENT_IDE_MCP_TOOLS: readonly AgentIdeMcpTool[] = [
  {
    id: 'get_job_status',
    label: 'Get Job Status',
    mode: 'read-only',
    roles: ['admin', 'portal'],
    description: 'Consulta estado de jobs OpenClaw sin mutar recursos.',
  },
  {
    id: 'list_ai_integrations',
    label: 'List AI Integrations',
    mode: 'read-only',
    roles: ['admin', 'portal'],
    description: 'Lista integraciones IA visibles para operación.',
  },
  {
    id: 'run_agent_task',
    label: 'Run Agent Task',
    mode: 'action',
    roles: ['admin'],
    description: 'Encola una tarea controlada para un agente.',
  },
] as const;

const ADMIN_ALLOWED_MCP_TOOLS: ReadonlySet<string> = new Set(AGENT_IDE_MCP_TOOLS.map((tool) => tool.id));
const PORTAL_ALLOWED_MCP_TOOLS: ReadonlySet<string> = new Set(
  AGENT_IDE_MCP_TOOLS.filter((tool) => tool.roles.includes('portal')).map((tool) => tool.id)
);

function adminToken(): string {
  return process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
}

export function missingAdminTokenResponse(): Response {
  return Response.json(
    { error: 'Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set' },
    { status: HTTP_STATUS.INTERNAL_ERROR }
  );
}

function orchestratorHeaders(): HeadersInit | null {
  const token = adminToken();
  if (token.length === 0) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function proxyOrchestrator(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = orchestratorHeaders();
  if (headers === null) return missingAdminTokenResponse();
  try {
    const response = await fetch(`${ORCHESTRATOR_INTERNAL_URL}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `orchestrator unreachable: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}

export async function startAgentIdeTerminal(
  body: AgentIdeTerminalStartBody,
  tenantSlugOverride?: string
): Promise<Response> {
  const tenantSlug = tenantSlugOverride ?? body.tenant_slug;
  return proxyOrchestrator('/internal/terminal/start', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      tenant_slug: tenantSlug,
    }),
  });
}

export function listAgentIdeTerminalSessions(agentId: string): Promise<Response> {
  return proxyOrchestrator(`/internal/terminal/${encodeURIComponent(agentId)}/sessions`);
}

export function readAgentIdeTerminalOutput(
  agentId: string,
  sessionId: string,
  offset: string | null
): Promise<Response> {
  const query = offset !== null ? `?offset=${encodeURIComponent(offset)}` : '';
  return proxyOrchestrator(
    `/internal/terminal/${encodeURIComponent(agentId)}/sessions/${encodeURIComponent(sessionId)}/output${query}`
  );
}

export function stopAgentIdeTerminalSession(agentId: string, sessionId: string): Promise<Response> {
  return proxyOrchestrator(
    `/internal/terminal/${encodeURIComponent(agentId)}/sessions/${encodeURIComponent(sessionId)}/stop`,
    { method: 'POST' }
  );
}

export function agentIdeMcpCatalog(surface: 'admin' | 'portal'): Response {
  const allowed = surface === 'admin' ? ADMIN_ALLOWED_MCP_TOOLS : PORTAL_ALLOWED_MCP_TOOLS;
  return Response.json({
    tools: AGENT_IDE_MCP_TOOLS.filter((tool) => allowed.has(tool.id)),
    policy: {
      surface,
      allowed_tool_ids: Array.from(allowed),
      ssh_requires_allowlist: true,
    },
  });
}

export async function executeAgentIdeMcpTool(
  surface: 'admin' | 'portal',
  body: unknown,
  tenantSlug?: string
): Promise<Response> {
  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'invalid body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const input = body as Record<string, unknown>;
  const toolId = typeof input.tool_id === 'string' ? input.tool_id.trim() : '';
  const allowed = surface === 'admin' ? ADMIN_ALLOWED_MCP_TOOLS : PORTAL_ALLOWED_MCP_TOOLS;
  if (!allowed.has(toolId)) {
    return Response.json({ error: 'mcp_tool_not_allowed' }, { status: HTTP_STATUS.FORBIDDEN });
  }

  return Response.json({
    ok: true,
    tool_id: toolId,
    tenant_slug: tenantSlug ?? null,
    mode: AGENT_IDE_MCP_TOOLS.find((tool) => tool.id === toolId)?.mode ?? 'read-only',
    result: {
      status: 'accepted',
      note: 'MCP execution is policy-gated; wire tool adapter here when enabling non-read-only execution.',
      input: typeof input.input === 'object' && input.input !== null ? input.input : {},
    },
  });
}
