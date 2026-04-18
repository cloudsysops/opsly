import { requireMCPAuth } from "./auth/middleware.js";
import { MCP_SERVER_INFO } from "./lib/constants.js";
import { aiIntegrationsTools } from "./tools/ai-integrations.js";
import { contextTools } from "./tools/context.js";
import { executorTool } from "./tools/executor.js";
import { invitationsTool } from "./tools/invitations.js";
import { metricsTool } from "./tools/metrics.js";
import { notebooklmTool } from "./tools/notebooklm.js";
import { opsStubsTools } from "./tools/ops-stubs.js";
import { onboardTool } from "./tools/onboard.js";
import { runAgentTaskTool } from "./tools/run-agent-task.tool.js";
import { suspendTools } from "./tools/suspend.js";
import { tenantsTools } from "./tools/tenants.js";
import type { ToolDefinition } from "./types/index.js";

interface RegisteredTool {
  name: string;
  handler: (input: unknown) => Promise<unknown>;
}

type ParseResult =
  | { success: true; data: unknown }
  | { success: false; error: { message: string } };

type SchemaWithSafeParse = {
  safeParse: (input: unknown) => ParseResult;
};

/** Scope OAuth requerido por tool cuando se envía `Authorization` en `callTool`. */
export const TOOL_REQUIRED_SCOPES: Record<string, string> = {
  get_tenants: "tenants:read",
  get_tenant: "tenants:read",
  onboard_tenant: "tenants:write",
  suspend_tenant: "tenants:write",
  resume_tenant: "tenants:write",
  send_invitation: "invitations:write",
  get_health: "metrics:read",
  get_metrics: "metrics:read",
  execute_prompt: "executor:write",
  notebooklm: "agents:write",
  run_agent_task: "agents:write",
  check_service_health: "metrics:read",
  restart_container: "tenants:write",
  list_ai_integrations: "metrics:read",
  probe_platform_component: "metrics:read",
  get_docker_containers: "metrics:read",
  list_context_resources: "metrics:read",
  read_context_resource: "metrics:read",
  list_adrs: "metrics:read",
  read_adr: "metrics:read",
};

export type CallToolOptions = {
  authorization?: string;
};

function isSchemaWithSafeParse(value: unknown): value is SchemaWithSafeParse {
  return (
    value !== null &&
    typeof value === "object" &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

function adaptTool<TInput, TOutput>(
  tool: ToolDefinition<TInput, TOutput>,
): RegisteredTool {
  return {
    name: tool.name,
    handler: async (input: unknown) => {
      if (isSchemaWithSafeParse(tool.inputSchema)) {
        const parsed = tool.inputSchema.safeParse(input);
        if (!parsed.success) {
          throw new Error(`Invalid input for ${tool.name}: ${parsed.error.message}`);
        }
        return tool.handler(parsed.data as TInput);
      }
      return tool.handler(input as TInput);
    },
  };
}

export class OpenClawMcpServer {
  public readonly name = MCP_SERVER_INFO.name;
  public readonly version = MCP_SERVER_INFO.version;
  public readonly description = MCP_SERVER_INFO.description;
  private readonly tools = new Map<string, RegisteredTool>();

  registerTools(toolDefinitions: RegisteredTool[]): void {
    for (const definition of toolDefinitions) {
      this.tools.set(definition.name, definition);
    }
  }

  async callTool(name: string, input: unknown, options?: CallToolOptions): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    const requiredScope = TOOL_REQUIRED_SCOPES[name];
    const authHeader = options?.authorization;
    if (requiredScope !== undefined && authHeader !== undefined) {
      const auth = requireMCPAuth(authHeader, requiredScope);
      if (!auth.authorized) {
        throw new Error(`Unauthorized: ${name} requires scope ${requiredScope}`);
      }
    }
    return tool.handler(input);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * Definiciones en el mismo orden que `createServer()` — usado por el transporte MCP (stdio) del SDK.
 */
export function getAllToolDefinitions(): ToolDefinition<unknown, unknown>[] {
  const [getTenantsTool, getTenantTool] = tenantsTools;
  const [getHealthTool, getMetricsTool] = metricsTool;
  const [listContextResourcesTool, readContextResourceTool, listAdrsTool, readAdrTool] =
    contextTools;
  const [suspendTenantTool, resumeTenantTool] = suspendTools;
  const [checkServiceHealthTool, restartContainerTool] = opsStubsTools;
  const [listAiIntegrationsTool, probePlatformComponentTool, getDockerContainersTool] =
    aiIntegrationsTools;
  return [
    getTenantsTool,
    getTenantTool,
    onboardTool,
    invitationsTool,
    getHealthTool,
    getMetricsTool,
    listContextResourcesTool,
    readContextResourceTool,
    listAdrsTool,
    readAdrTool,
    suspendTenantTool,
    resumeTenantTool,
    executorTool,
    runAgentTaskTool,
    notebooklmTool,
    checkServiceHealthTool,
    restartContainerTool,
    listAiIntegrationsTool,
    probePlatformComponentTool,
    getDockerContainersTool,
  ] as ToolDefinition<unknown, unknown>[];
}

export function createServer(): OpenClawMcpServer {
  const server = new OpenClawMcpServer();
  const definitions = getAllToolDefinitions();
  server.registerTools(definitions.map((d) => adaptTool(d)));
  return server;
}
