import { MCP_SERVER_INFO } from "./lib/constants.js";
import { executorTool } from "./tools/executor.js";
import { invitationsTool } from "./tools/invitations.js";
import { metricsTool } from "./tools/metrics.js";
import { onboardTool } from "./tools/onboard.js";
import { suspendTools } from "./tools/suspend.js";
import { tenantsTools } from "./tools/tenants.js";
import type { ToolDefinition } from "./types/index.js";

interface RegisteredTool {
  name: string;
  handler: (input: unknown) => Promise<unknown>;
}

function adaptTool<TInput, TOutput>(
  tool: ToolDefinition<TInput, TOutput>,
): RegisteredTool {
  return {
    name: tool.name,
    handler: async (input: unknown) => tool.handler(input as TInput),
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

  async callTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.handler(input);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

export function createServer(): OpenClawMcpServer {
  const server = new OpenClawMcpServer();
  const [getTenantsTool, getTenantTool] = tenantsTools;
  const [getHealthTool, getMetricsTool] = metricsTool;
  const [suspendTenantTool, resumeTenantTool] = suspendTools;
  server.registerTools([
    adaptTool(getTenantsTool),
    adaptTool(getTenantTool),
    adaptTool(onboardTool),
    adaptTool(invitationsTool),
    adaptTool(getHealthTool),
    adaptTool(getMetricsTool),
    adaptTool(suspendTenantTool),
    adaptTool(resumeTenantTool),
    adaptTool(executorTool),
  ]);
  return server;
}
