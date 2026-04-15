import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { MCP_SERVER_INFO } from "./lib/constants.js";
import type { OpenClawMcpServer } from "./server.js";
import type { ToolDefinition } from "./types/index.js";

function isZodSchema(value: unknown): value is z.ZodType<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

function toolInputSchema(def: ToolDefinition<unknown, unknown>): z.ZodType<unknown> {
  if (isZodSchema(def.inputSchema)) {
    return def.inputSchema;
  }
  return z.object({});
}

/**
 * Arranca el protocolo MCP sobre **stdio** (JSON-RPC), para Cursor / Claude Desktop / CLI.
 * Reutiliza `OpenClawMcpServer.callTool` (validación Zod + tools existentes).
 */
export async function startMcpStdioServer(
  openClaw: OpenClawMcpServer,
  definitions: ToolDefinition<unknown, unknown>[],
): Promise<void> {
  const mcp = new McpServer(
    {
      name: MCP_SERVER_INFO.name,
      version: MCP_SERVER_INFO.version,
    },
    {
      instructions: MCP_SERVER_INFO.description,
    },
  );

  for (const def of definitions) {
    const inputSchema = toolInputSchema(def);
    mcp.registerTool(
      def.name,
      {
        description: def.description,
        inputSchema,
      },
      async (args) => {
        try {
          const out = await openClaw.callTool(def.name, args ?? {}, {});
          const text =
            typeof out === "string" ? out : JSON.stringify(out, null, 2);
          return { content: [{ type: "text", text }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}
