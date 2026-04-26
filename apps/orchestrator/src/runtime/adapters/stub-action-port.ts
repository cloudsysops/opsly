/**
 * Puerto de acciones stub para OAR cuando MCP/API no están configurados en el proceso.
 *
 * @see docs/design/OAR.md — §4.2 AgentActionPort
 */

import type { AgentActionPort, ToolResult } from '../interfaces/agent-action-port.js';

export class StubAgentActionPort implements AgentActionPort {
  async executeAction(
    _tenantSlug: string,
    actionName: string,
    _args: Record<string, unknown>
  ): Promise<ToolResult> {
    return {
      success: true,
      observation: `[stub] "${actionName}" no ejecuta herramientas reales en este proceso. Responde con final_answer cuando tengas la respuesta.`,
    };
  }
}
