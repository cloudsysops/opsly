import { z } from 'zod';

import { setActiveMode } from '../modes/middleware.js';
import type { BillingPlan, OpslyModeId } from '../modes/types.js';
import { getAvailableModes } from '../modes/registry.js';
import type { ToolDefinition } from '../types/index.js';

const SetModeInput = z.object({
  session_id: z.string().min(1).describe('Identificador de sesión MCP / cliente'),
  mode: z
    .string()
    .min(1)
    .describe('Id de modo (p. ej. developer, quantum, ops)'),
  tenant_plan: z
    .enum(['startup', 'business', 'enterprise'])
    .describe('Plan del tenant para validar acceso al modo'),
});

export const setModeTool: ToolDefinition<z.infer<typeof SetModeInput>, unknown> = {
  name: 'set_mode',
  description:
    'Activa el modo Opsly para la sesión dada (Redis, TTL 8h). Valida plan vs modo (p. ej. quantum → enterprise).',
  inputSchema: SetModeInput,
  handler: async (input) => {
    const parsed = SetModeInput.parse(input);
    const modeId = parsed.mode as OpslyModeId;
    const plan = parsed.tenant_plan as BillingPlan;
    await setActiveMode(parsed.session_id, modeId, plan);
    return {
      ok: true,
      session_id: parsed.session_id,
      mode: modeId,
      available_modes: getAvailableModes(plan),
    };
  },
};
