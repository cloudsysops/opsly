import { z } from 'zod';
import { opslyFetch } from '../lib/api-client.js';
import { publishEvent } from '../lib/events.js';
import type { ToolDefinition } from '../types/index.js';

interface InvitationInput {
  email: string;
  tenant_ref: string;
  mode: 'developer' | 'managed';
}

export const invitationsTool: ToolDefinition<InvitationInput, Record<string, unknown>> = {
  name: 'send_invitation',
  description: 'Envia invitacion por email al portal de un tenant',
  inputSchema: z.object({
    email: z.string().email(),
    tenant_ref: z.string(),
    mode: z.enum(['developer', 'managed']).default('developer'),
  }),
  handler: async (input: InvitationInput) => {
    const result = (await opslyFetch('/api/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        tenantRef: input.tenant_ref,
        mode: input.mode,
      }),
    })) as { link?: string };

    await publishEvent('invite.sent', {
      tenant_ref: input.tenant_ref,
      email: input.email,
      mode: input.mode,
    });

    return {
      success: true,
      email: input.email,
      link_preview: result.link ? `${result.link.slice(0, 50)}...` : null,
    };
  },
};
