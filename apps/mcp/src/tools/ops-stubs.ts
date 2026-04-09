import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

/**
 * Stubs para acciones operativas que el Remote Planner puede proponer.
 * TODO: Implement logic — hoy solo registran intención en logs.
 */
export const opsStubsTools: [
  ToolDefinition<{ service?: string }, { ok: boolean; stub: true; message: string }>,
  ToolDefinition<{ container?: string }, { ok: boolean; stub: true; message: string }>,
] = [
  {
    name: "check_service_health",
    description: "Comprueba salud de un servicio (stub; conectar a API/metrics en producción).",
    inputSchema: z.object({ service: z.string().optional() }),
    handler: async (input) => {
      console.log("[check_service_health] TODO: Implement logic", input);
      return {
        ok: true,
        stub: true,
        message: "check_service_health stub — implement metrics/health integration",
      };
    },
  },
  {
    name: "restart_container",
    description: "Reinicia un contenedor Docker (stub; requiere backend seguro).",
    inputSchema: z.object({ container: z.string().optional() }),
    handler: async (input) => {
      console.log("[restart_container] TODO: Implement logic", input);
      return {
        ok: true,
        stub: true,
        message: "restart_container stub — implement orchestrated restart with auth",
      };
    },
  },
];
