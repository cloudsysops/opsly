export type RuntimeMcpToolId =
  | 'runtime_list_sessions'
  | 'runtime_create_session'
  | 'runtime_session_logs'
  | 'runtime_session_send'
  | 'runtime_session_stop';

export type RuntimeMcpMode = 'read-only' | 'action';

export interface RuntimeMcpToolDef {
  id: RuntimeMcpToolId;
  mode: RuntimeMcpMode;
  description: string;
}

export const RUNTIME_MCP_TOOLS: readonly RuntimeMcpToolDef[] = [
  {
    id: 'runtime_list_sessions',
    mode: 'read-only',
    description: 'List Opsly tmux runtime sessions (metadata only).',
  },
  {
    id: 'runtime_session_logs',
    mode: 'read-only',
    description: 'Capture recent output from a runtime session pane.',
  },
  {
    id: 'runtime_create_session',
    mode: 'action',
    description: 'Create a new persistent runtime session (requires approval on VPS).',
  },
  {
    id: 'runtime_session_send',
    mode: 'action',
    description: 'Send a command to a runtime session (controlled worker).',
  },
  {
    id: 'runtime_session_stop',
    mode: 'action',
    description: 'Stop and tear down a runtime tmux session.',
  },
] as const;

const ACTION_TOOLS: ReadonlySet<RuntimeMcpToolId> = new Set(
  RUNTIME_MCP_TOOLS.filter((t) => t.mode === 'action').map((t) => t.id)
);

export function isRuntimeMcpToolAllowed(
  toolId: string,
  options: { allowActions: boolean }
): toolId is RuntimeMcpToolId {
  if (!RUNTIME_MCP_TOOLS.some((t) => t.id === toolId)) {
    return false;
  }
  if (ACTION_TOOLS.has(toolId as RuntimeMcpToolId) && !options.allowActions) {
    return false;
  }
  return true;
}
