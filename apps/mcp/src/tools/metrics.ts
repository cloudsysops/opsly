import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import type { ToolDefinition } from "../types/index.js";

export const metricsTool: [
  ToolDefinition<Record<string, never>, unknown>,
  ToolDefinition<Record<string, never>, unknown>
] = [
  {
    name: "get_health",
    description: "Verifica que la API de Opsly esta funcionando",
    inputSchema: z.object({}),
    handler: async () => opslyFetch("/api/health")
  },
  {
    name: "get_metrics",
    description: "Metrica de sistema: CPU, RAM, disco, uptime y contenedores",
    inputSchema: z.object({}),
    handler: async () => opslyFetch("/api/metrics/system")
  }
];
