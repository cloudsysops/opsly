import { z } from 'zod';
import { opslyFetch } from '../lib/api-client.js';
import type { ToolDefinition } from '../types/index.js';

interface GetTenantInput {
  ref: string;
}

export const tenantsTools: [
  ToolDefinition<Record<string, never>, { tenants: unknown }>,
  ToolDefinition<GetTenantInput, { tenant: unknown }>,
] = [
  {
    name: 'get_tenants',
    description: 'Lista todos los tenants de Opsly con su estado',
    inputSchema: z.object({}),
    handler: async () => {
      const data = await opslyFetch('/api/tenants');
      return { tenants: data };
    },
  },
  {
    name: 'get_tenant',
    description: 'Obtiene detalle de un tenant por slug o UUID',
    inputSchema: z.object({
      ref: z.string().describe('Slug o UUID del tenant'),
    }),
    handler: async ({ ref }: GetTenantInput) => {
      const data = await opslyFetch(`/api/tenants/${ref}`);
      return { tenant: data };
    },
  },
];
