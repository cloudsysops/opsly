import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import type { ToolDefinition } from "../types/index.js";

interface TenantIdInput {
  id: string;
}

export const suspendTools: [
  ToolDefinition<TenantIdInput, Record<string, unknown>>,
  ToolDefinition<TenantIdInput, Record<string, unknown>>
] = [
  {
    name: "suspend_tenant",
    description: "Suspende un tenant por id",
    inputSchema: z.object({ id: z.string() }),
    handler: async ({ id }: TenantIdInput) => {
      const data = await opslyFetch(`/api/tenants/${id}/suspend`, { method: "POST" });
      return { success: true, data };
    }
  },
  {
    name: "resume_tenant",
    description: "Reanuda un tenant por id",
    inputSchema: z.object({ id: z.string() }),
    handler: async ({ id }: TenantIdInput) => {
      const data = await opslyFetch(`/api/tenants/${id}/resume`, { method: "POST" });
      return { success: true, data };
    }
  }
];
