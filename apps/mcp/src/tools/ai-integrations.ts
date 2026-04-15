import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import { HTTP_TIMEOUT_MS } from "../lib/constants.js";
import type { ToolDefinition } from "../types/index.js";

type PlatformComponent = "llm_gateway" | "orchestrator" | "context_builder" | "mcp";

type IntegrationRow = {
  id: string;
  kind: "mcp_tool" | "http_service" | "workflow";
  label: string;
  description: string;
  mcp_tool?: string;
  opsly_stack?: string;
  notes?: string;
};

type ProbeResult = {
  component: PlatformComponent;
  base_url: string;
  health_url: string;
  ok: boolean;
  status: number;
  snapshot: unknown;
};

function baseUrlFor(component: PlatformComponent): string | null {
  switch (component) {
    case "llm_gateway": {
      const u =
        process.env.MCP_LLM_GATEWAY_URL ??
        process.env.LLM_GATEWAY_INTERNAL_URL ??
        process.env.ORCHESTRATOR_LLM_GATEWAY_URL;
      return u?.trim() ? u.replace(/\/$/, "") : null;
    }
    case "orchestrator": {
      const u = process.env.MCP_ORCHESTRATOR_URL ?? process.env.ORCHESTRATOR_INTERNAL_URL;
      return u?.trim() ? u.replace(/\/$/, "") : null;
    }
    case "context_builder": {
      const u = process.env.MCP_CONTEXT_BUILDER_URL ?? process.env.CONTEXT_BUILDER_INTERNAL_URL;
      return u?.trim() ? u.replace(/\/$/, "") : null;
    }
    case "mcp": {
      const raw = process.env.PORT ?? "3003";
      const p = Number.parseInt(raw, 10);
      const port = Number.isFinite(p) && p > 0 ? p : 3003;
      return `http://127.0.0.1:${String(port)}`;
    }
    default:
      return null;
  }
}

async function fetchHealth(
  url: string,
): Promise<{ ok: boolean; status: number; snapshot: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    let snapshot: unknown = text.slice(0, 2000);
    try {
      snapshot = JSON.parse(text) as unknown;
    } catch {
      /* texto plano */
    }
    return { ok: res.ok, status: res.status, snapshot };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      snapshot: { error: err instanceof Error ? err.message : String(err) },
    };
  } finally {
    clearTimeout(timer);
  }
}

function builtInCatalog(): IntegrationRow[] {
  return [
    {
      id: "cursor_via_github_prompt",
      kind: "mcp_tool",
      label: "Cursor (remoto / VPS)",
      description:
        "Escribe la tarea en docs/ACTIVE-PROMPT.md vía GitHub; el monitor o el humano ejecuta en el entorno con Cursor.",
      mcp_tool: "execute_prompt",
      notes: "No abre el IDE; encola trabajo reproducible en el repo.",
    },
    {
      id: "docker_ops",
      kind: "mcp_tool",
      label: "Docker (plataforma)",
      description: "Listar contenedores en el host de la API o pedir reinicio vía prompt seguro.",
      mcp_tool: "get_docker_containers | restart_container",
      opsly_stack: "API ejecuta docker ps (admin)",
    },
    {
      id: "llm_stack",
      kind: "workflow",
      label: "Claude / modelos cloud / Ollama local",
      description:
        "Toda inferencia va al LLM Gateway (routing, costos, fallback). No uses claves de proveedor desde MCP.",
      opsly_stack: "llm-gateway → providers (incl. llama_local si OLLAMA_URL)",
      notes: "Copilot (IDE) y Cursor son clientes humanos; este MCP orquesta Opsly, no sustituye al IDE.",
    },
    {
      id: "notebooklm_agent",
      kind: "mcp_tool",
      label: "NotebookLM (experimental)",
      description: "Artefactos y flujos NotebookLM cuando el tenant y flags lo permiten.",
      mcp_tool: "notebooklm",
    },
    {
      id: "tenant_portal_health",
      kind: "mcp_tool",
      label: "Salud API / tenant",
      description: "Health público o por slug de tenant.",
      mcp_tool: "check_service_health",
    },
  ];
}

function parseExtraIntegrations(): IntegrationRow[] {
  const raw = process.env.MCP_EXTRA_INTEGRATIONS_JSON?.trim();
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: IntegrationRow[] = [];
    for (const item of parsed) {
      if (item === null || typeof item !== "object") {
        continue;
      }
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const label = typeof o.label === "string" ? o.label : "";
      const description = typeof o.description === "string" ? o.description : "";
      if (id.length === 0 || label.length === 0) {
        continue;
      }
      out.push({
        id,
        kind: "workflow",
        label,
        description,
        notes: typeof o.notes === "string" ? o.notes : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export const listAiIntegrationsTool: ToolDefinition<
  { include_health_snapshots?: boolean },
  { integrations: IntegrationRow[]; probes?: ProbeResult[] }
> = {
  name: "list_ai_integrations",
  description:
    "Catálogo de integraciones de IA y agentes (Cursor via GitHub prompt, Docker, LLM Gateway, NotebookLM). Opcional: snapshots /health de servicios internos configurados por env.",
  inputSchema: z.object({
    include_health_snapshots: z.boolean().optional(),
  }),
  handler: async ({ include_health_snapshots }) => {
    const integrations = [...builtInCatalog(), ...parseExtraIntegrations()];
    if (include_health_snapshots !== true) {
      return { integrations };
    }

    const probes: ProbeResult[] = [];
    const components: PlatformComponent[] = [
      "llm_gateway",
      "orchestrator",
      "context_builder",
      "mcp",
    ];
    for (const c of components) {
      const base = baseUrlFor(c);
      if (!base) {
        probes.push({
          component: c,
          base_url: "",
          health_url: "",
          ok: false,
          status: 0,
          snapshot: { skipped: "no MCP_*_URL for component" },
        });
        continue;
      }
      const healthUrl = `${base}/health`;
      const { ok, status, snapshot } = await fetchHealth(healthUrl);
      probes.push({
        component: c,
        base_url: base,
        health_url: healthUrl,
        ok,
        status,
        snapshot,
      });
    }
    return { integrations, probes };
  },
};

export const probePlatformComponentTool: ToolDefinition<
  { component: PlatformComponent },
  ProbeResult
> = {
  name: "probe_platform_component",
  description:
    "GET /health de un servicio interno allowlist (llm-gateway, orchestrator, context-builder, mcp). URLs solo desde variables de entorno MCP_*.",
  inputSchema: z.object({
    component: z.enum(["llm_gateway", "orchestrator", "context_builder", "mcp"]),
  }),
  handler: async ({ component }) => {
    const base = baseUrlFor(component);
    if (!base) {
      throw new Error(
        `No hay URL base en env para ${component} (define MCP_LLM_GATEWAY_URL, MCP_ORCHESTRATOR_URL, MCP_CONTEXT_BUILDER_URL según corresponda)`,
      );
    }
    const healthUrl = `${base}/health`;
    const { ok, status, snapshot } = await fetchHealth(healthUrl);
    return {
      component,
      base_url: base,
      health_url: healthUrl,
      ok,
      status,
      snapshot,
    };
  },
};

type DockerContainersResponse = {
  docker_available?: boolean;
  containers?: unknown[];
  truncated?: boolean;
  limit?: number;
  error?: string | null;
};

export const getDockerContainersTool: ToolDefinition<
  Record<string, never>,
  DockerContainersResponse
> = {
  name: "get_docker_containers",
  description:
    "Lista contenedores Docker en el host de la API (GET /api/admin/docker/containers). Requiere token admin en el entorno MCP.",
  inputSchema: z.object({}),
  handler: async () => {
    const data = (await opslyFetch(
      "/api/admin/docker/containers",
    )) as DockerContainersResponse;
    return data;
  },
};

export const aiIntegrationsTools: [
  typeof listAiIntegrationsTool,
  typeof probePlatformComponentTool,
  typeof getDockerContainersTool,
] = [listAiIntegrationsTool, probePlatformComponentTool, getDockerContainersTool];
