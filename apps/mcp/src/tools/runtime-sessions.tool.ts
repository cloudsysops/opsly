import { z } from 'zod';
import { appendRuntimeAudit } from '../runtime/audit.js';
import { isRuntimeMcpToolAllowed, type RuntimeMcpToolId } from '../runtime/permissions.js';
import type { ToolDefinition } from '../types/index.js';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_INTERNAL_URL?.trim() ?? 'http://127.0.0.1:3011';
const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';

const baseInput = z.object({
  tenant_slug: z.string().min(3).optional(),
  allow_actions: z.boolean().optional(),
});

type RuntimeProxyResult = { ok: boolean; raw: string };

async function proxyRuntime(
  toolId: RuntimeMcpToolId,
  path: string,
  init: RequestInit,
  tenantSlug?: string
): Promise<RuntimeProxyResult> {
  if (ADMIN_TOKEN.length === 0) {
    await appendRuntimeAudit({
      ts: new Date().toISOString(),
      tool_id: toolId,
      tenant_slug: tenantSlug,
      allowed: false,
      status: 'error',
      message: 'PLATFORM_ADMIN_TOKEN not configured',
    });
    return { ok: false, raw: JSON.stringify({ ok: false, error: 'PLATFORM_ADMIN_TOKEN not configured' }) };
  }
  const response = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  await appendRuntimeAudit({
    ts: new Date().toISOString(),
    tool_id: toolId,
    tenant_slug: tenantSlug,
    allowed: response.ok,
    status: response.ok ? 'ok' : 'error',
    message: response.ok ? undefined : text.slice(0, 200),
  });
  return { ok: response.ok, raw: text };
}

const listInput = baseInput;
type ListInput = z.infer<typeof listInput>;

export const runtimeListSessionsTool: ToolDefinition<ListInput, RuntimeProxyResult> = {
  name: 'runtime_list_sessions',
  description: 'List Opsly persistent runtime (tmux) sessions.',
  inputSchema: listInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_list_sessions';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: false })) {
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'tool not allowed' }) };
    }
    return proxyRuntime(toolId, '/internal/runtime/sessions', { method: 'GET' }, input.tenant_slug);
  },
};

const createInput = baseInput.extend({
  name: z.string().min(1),
  agentId: z.string().min(1).default('mcp'),
  workspace: z.string().min(1).optional(),
  initialCommand: z.string().optional(),
});
type CreateInput = z.infer<typeof createInput>;

export const runtimeCreateSessionTool: ToolDefinition<CreateInput, RuntimeProxyResult> = {
  name: 'runtime_create_session',
  description: 'Create a new Opsly runtime tmux session (action; set allow_actions=true).',
  inputSchema: createInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_create_session';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: input.allow_actions === true })) {
      await appendRuntimeAudit({
        ts: new Date().toISOString(),
        tool_id: toolId,
        tenant_slug: input.tenant_slug,
        allowed: false,
        status: 'denied',
        message: 'allow_actions required',
      });
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'allow_actions required' }) };
    }
    return proxyRuntime(
      toolId,
      '/internal/runtime/sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          agentId: input.agentId,
          workspace: input.workspace,
          initialCommand: input.initialCommand,
        }),
      },
      input.tenant_slug
    );
  },
};

const logsInput = baseInput.extend({ session_id: z.string().min(1) });
type LogsInput = z.infer<typeof logsInput>;

export const runtimeSessionLogsTool: ToolDefinition<LogsInput, RuntimeProxyResult> = {
  name: 'runtime_session_logs',
  description: 'Fetch recent output from a runtime session pane.',
  inputSchema: logsInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_session_logs';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: false })) {
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'tool not allowed' }) };
    }
    return proxyRuntime(
      toolId,
      `/internal/runtime/sessions/${encodeURIComponent(input.session_id)}/logs`,
      { method: 'GET' },
      input.tenant_slug
    );
  },
};

const sendInput = baseInput.extend({
  session_id: z.string().min(1),
  command: z.string().min(1),
});
type SendInput = z.infer<typeof sendInput>;

export const runtimeSessionSendTool: ToolDefinition<SendInput, RuntimeProxyResult> = {
  name: 'runtime_session_send',
  description: 'Send a command to a runtime tmux session.',
  inputSchema: sendInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_session_send';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: input.allow_actions === true })) {
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'allow_actions required' }) };
    }
    return proxyRuntime(
      toolId,
      `/internal/runtime/sessions/${encodeURIComponent(input.session_id)}/send`,
      {
        method: 'POST',
        body: JSON.stringify({ command: input.command }),
      },
      input.tenant_slug,
    );
  },
};

const stopInput = baseInput.extend({ session_id: z.string().min(1) });
type StopInput = z.infer<typeof stopInput>;

export const runtimeSessionStopTool: ToolDefinition<StopInput, RuntimeProxyResult> = {
  name: 'runtime_session_stop',
  description: 'Stop a runtime tmux session.',
  inputSchema: stopInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_session_stop';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: input.allow_actions === true })) {
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'allow_actions required' }) };
    }
    return proxyRuntime(
      toolId,
      `/internal/runtime/sessions/${encodeURIComponent(input.session_id)}/stop`,
      { method: 'POST', body: '{}' },
      input.tenant_slug,
    );
  },
};

const resumeInput = baseInput.extend({
  session_id: z.string().min(1),
  relaunch_command: z.string().optional(),
});
type ResumeInput = z.infer<typeof resumeInput>;

export const runtimeResumeSessionTool: ToolDefinition<ResumeInput, RuntimeProxyResult> = {
  name: 'runtime_resume_session',
  description: 'Resume a disconnected or resumable runtime session.',
  inputSchema: resumeInput,
  handler: async (input) => {
    const toolId: RuntimeMcpToolId = 'runtime_resume_session';
    if (!isRuntimeMcpToolAllowed(toolId, { allowActions: input.allow_actions === true })) {
      return { ok: false, raw: JSON.stringify({ ok: false, error: 'allow_actions required' }) };
    }
    return proxyRuntime(
      toolId,
      `/internal/runtime/sessions/${encodeURIComponent(input.session_id)}/resume`,
      {
        method: 'POST',
        body: JSON.stringify({ relaunchCommand: input.relaunch_command }),
      },
      input.tenant_slug,
    );
  },
};

export const runtimeSessionsTools = [
  runtimeListSessionsTool,
  runtimeCreateSessionTool,
  runtimeSessionLogsTool,
  runtimeSessionSendTool,
  runtimeSessionStopTool,
  runtimeResumeSessionTool,
] as const;
