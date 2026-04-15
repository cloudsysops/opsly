import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getAvailableStaticContextResources,
  listAdrResources,
  readAdrResource,
  readStaticContextResource,
} from "./context-resources.js";
import { MCP_SERVER_INFO } from "./lib/constants.js";
import { TOOL_REQUIRED_SCOPES, type OpenClawMcpServer } from "./server.js";
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

function humanizeName(value: string): string {
  return value
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asStructuredContent(result: unknown): Record<string, unknown> {
  if (result !== null && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return { result };
}

export function createSdkBridgeServer(
  openClaw: OpenClawMcpServer,
  definitions: ToolDefinition<unknown, unknown>[],
): McpServer {
  const mcp = new McpServer(
    {
      name: MCP_SERVER_INFO.name,
      version: MCP_SERVER_INFO.version,
    },
    {
      instructions:
        "Usa tools para acciones sobre Opsly, resources para leer el contexto fuente de verdad " +
        "y prompts para arrancar sesiones compartiendo estado entre agentes.",
    },
  );

  for (const def of definitions) {
    const inputSchema = toolInputSchema(def);
    const requiredScope = TOOL_REQUIRED_SCOPES[def.name];
    mcp.registerTool(
      def.name,
      {
        title: humanizeName(def.name),
        description: def.description,
        inputSchema,
        _meta: requiredScope ? { requiredScope } : undefined,
      },
      async (args, extra) => {
        try {
          const auth =
            extra.authInfo?.token !== undefined
              ? { authorization: `Bearer ${extra.authInfo.token}` }
              : {};
          const out = await openClaw.callTool(def.name, args ?? {}, auth);
          const text = typeof out === "string" ? out : JSON.stringify(out, null, 2);
          return {
            content: [{ type: "text", text }],
            structuredContent: asStructuredContent(out),
          };
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

  for (const resource of getAvailableStaticContextResources()) {
    mcp.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async () => {
        const entry = readStaticContextResource(resource.uri);
        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: entry.text,
            },
          ],
        };
      },
    );
  }

  const adrTemplate = new ResourceTemplate("opsly://adr/{slug}", {
    list: async () => ({
      resources: listAdrResources().map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    }),
  });

  mcp.registerResource(
    "opsly-adr",
    adrTemplate,
    {
      title: "ADR documents",
      description: "Architecture Decision Records from docs/adr.",
      mimeType: "text/markdown",
    },
    async (_uri, variables) => {
      const slug = typeof variables.slug === "string" ? variables.slug : "";
      const entry = readAdrResource(slug);
      return {
        contents: [
          {
            uri: entry.resource.uri,
            mimeType: entry.resource.mimeType,
            text: entry.text,
          },
        ],
      };
    },
  );

  mcp.registerPrompt(
    "opsly_startup",
    {
      title: "Opsly Startup Context",
      description: "Prompt de arranque para resumir decisiones, bloqueantes y prioridades.",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Lee los resources `opsly://context/agents`, `opsly://context/vision`, " +
              "`opsly://context/system-state` y los ADR relevantes. Resume en 5 bullets: " +
              "decisiones recientes, bloqueantes, prioridades, optimizaciones y qué no hacer.",
          },
        },
      ],
    }),
  );

  mcp.registerPrompt(
    "opsly_handoff",
    {
      title: "Opsly Agent Handoff",
      description: "Genera un handoff corto y accionable entre agentes.",
      argsSchema: {
        target_agent: z.string().min(1).describe("Agente destino"),
        task: z.string().min(5).describe("Tarea o frente delegado"),
      },
    },
    async ({ target_agent, task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Prepara un handoff para ${target_agent} sobre ${task}. ` +
              "Incluye contexto actual, bloqueantes, fuente de verdad a leer y siguiente paso verificable.",
          },
        },
      ],
    }),
  );

  return mcp;
}

/**
 * Arranca el protocolo MCP sobre **stdio** (JSON-RPC), para Cursor / Claude Desktop / CLI.
 * Reutiliza `OpenClawMcpServer.callTool` (validación Zod + tools existentes).
 */
export async function startMcpStdioServer(
  openClaw: OpenClawMcpServer,
  definitions: ToolDefinition<unknown, unknown>[],
): Promise<void> {
  const mcp = createSdkBridgeServer(openClaw, definitions);
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}
