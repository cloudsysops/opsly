import { z } from 'zod';

import { resolveModeContext } from '../modes/middleware.js';
import type { BillingPlan } from '../modes/types.js';
import { getAvailableModes } from '../modes/registry.js';
import type { ToolDefinition } from '../types/index.js';

const GetModeInput = z.object({
  session_id: z.string().min(1),
  tenant_plan: z.enum(['startup', 'business', 'enterprise']).optional(),
});

export const getModeTool: ToolDefinition<z.infer<typeof GetModeInput>, unknown> = {
  name: 'get_mode',
  description: 'Lee el modo activo para la sesión desde Redis y opcionalmente lista modos disponibles por plan.',
  inputSchema: GetModeInput,
  handler: async (input) => {
    const parsed = GetModeInput.parse(input);
    const ctx = await resolveModeContext(parsed.session_id);
    const plan = parsed.tenant_plan as BillingPlan | undefined;
    return {
      ok: true,
      session_id: parsed.session_id,
      mode: ctx.modeId,
      display_name: ctx.definition.displayName,
      ...(plan !== undefined ? { available_modes: getAvailableModes(plan) } : {}),
    };
  },
};
