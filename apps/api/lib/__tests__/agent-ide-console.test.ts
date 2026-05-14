import { describe, expect, it } from 'vitest';
import { agentIdeMcpCatalog, executeAgentIdeMcpTool } from '../agent-ide-console';

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe('agent IDE console policy', () => {
  it('exposes action tools to admin but only read-only tools to portal', async () => {
    const adminCatalog = await json(agentIdeMcpCatalog('admin'));
    const portalCatalog = await json(agentIdeMcpCatalog('portal'));

    const adminTools = adminCatalog.tools as { id: string }[];
    const portalTools = portalCatalog.tools as { id: string }[];

    expect(adminTools.map((tool) => tool.id)).toContain('run_agent_task');
    expect(portalTools.map((tool) => tool.id)).not.toContain('run_agent_task');
  });

  it('blocks portal execution for admin-only MCP tools', async () => {
    const response = await executeAgentIdeMcpTool('portal', {
      tool_id: 'run_agent_task',
      input: { agent_id: 'cursor' },
    });

    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({ error: 'mcp_tool_not_allowed' });
  });

  it('accepts read-only portal MCP tools with tenant context', async () => {
    const response = await executeAgentIdeMcpTool(
      'portal',
      { tool_id: 'get_job_status', input: { job_id: 'job-1' } },
      'tenant-a'
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.tool_id).toBe('get_job_status');
    expect(body.tenant_slug).toBe('tenant-a');
  });
});
