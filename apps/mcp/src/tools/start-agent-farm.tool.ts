import { z } from 'zod';
import type { ToolDefinition } from '../types/index.js';

const agentFarmInputSchema = z.object({
  role: z.enum(['dev-api', 'dev-ui', 'devops']),
  task: z.string().min(1),
  max_steps: z.number().int().positive().max(100).optional(),
  tenant_slug: z.string().min(1).optional(),
});

type AgentFarmParams = z.infer<typeof agentFarmInputSchema>;

interface AgentFarmResult {
  ok: boolean;
  job_id?: string;
  error?: string;
}

async function executeAgentFarm(params: AgentFarmParams): Promise<AgentFarmResult> {
  try {
    const p = params;

    const response = await fetch('http://localhost:3011/api/jobs/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_farm',
        payload: {
          role: p.role,
          task: p.task,
          max_steps: p.max_steps ?? 30,
          tenant_slug: p.tenant_slug,
        },
        tenant_slug: p.tenant_slug ?? 'opsly-internal',
        initiated_by: 'claude',
        agent_role: 'executor',
        metadata: {
          source: 'mcp-start-agent-farm',
        },
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = (await response.json()) as { id?: string; error?: string };
    return {
      ok: true,
      job_id: String(result.id ?? 'unknown'),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const StartAgentFarmTool: ToolDefinition<AgentFarmParams, AgentFarmResult> = {
  name: 'start_agent_farm',
  description:
    'Enqueue an agent farm job to execute a development task autonomously. Dispatches to dev-api, dev-ui, or devops bot depending on scope.',
  inputSchema: agentFarmInputSchema,
  handler: executeAgentFarm,
};
