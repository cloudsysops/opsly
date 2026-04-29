import { describe, expect, it } from 'vitest';
import { routeOpenClawIntent } from '../src/openclaw/router.js';
import { applyOpenClawControlLayer } from '../src/openclaw/control-layer.js';
import { assertTenantAwarePermissions } from '../src/openclaw/tenant-aware-permissions.js';
import type { IntentRequest } from '../src/types.js';

function baseRequest(overrides: Partial<IntentRequest> = {}): IntentRequest {
  return {
    intent: 'notify',
    context: {},
    tenant_slug: 'localrank',
    initiated_by: 'system',
    ...overrides,
  };
}

describe('openclaw router + contracts', () => {
  it('redirects planner role to remote_plan', () => {
    const result = routeOpenClawIntent(baseRequest({ intent: 'notify', agent_role: 'planner' }));
    expect(result.intent).toBe('remote_plan');
  });

  it('enforces role contract and throws on invalid intent', () => {
    expect(() =>
      applyOpenClawControlLayer(baseRequest({ intent: 'execute_code', agent_role: 'notifier' }))
    ).toThrow(/contract violation/);
  });

  it('reuses bullmq transport when queue target exists', () => {
    const result = applyOpenClawControlLayer(baseRequest({ intent: 'notify', agent_role: 'planner' }));
    expect(result.execution.target).toBe('queue');
    expect(result.execution.transport).toBe('bullmq');
    expect(result.execution.queue).toBe('openclaw');
    expect(result.agent.skill_binding).toBe('opsly-orchestrator');
    expect(result.execution.skill).toBeNull();
    expect(result.execution.mcp).toBeNull();
    expect(result.llm.routing_bias).toBe('balanced');
  });

  it('supports MCP execution for tool role when requested', () => {
    const result = applyOpenClawControlLayer(
      baseRequest({
        intent: 'sync_drive',
        agent_role: 'tool',
        context: { dispatch_via: 'mcp', mcp_tool: 'drive-sync' },
      })
    );
    expect(result.execution.target).toBe('mcp');
    expect(result.execution.transport).toBe('mcp');
    expect(result.execution.mcp?.server).toBe('project-0-intcloudsysops-opsly-openclaw');
    expect(result.execution.mcp?.tool).toBe('drive-sync');
  });

  it('blocks cross-tenant access for self-scoped roles', () => {
    expect(() =>
      applyOpenClawControlLayer(
        baseRequest({
          intent: 'notify',
          agent_role: 'planner',
          context: { target_tenant_slug: 'another-tenant', tenant_governance_approved: true },
        })
      )
    ).toThrow(/cross-tenant-read permission required/);
  });

  it('allows approved cross-tenant read for researcher role', () => {
    const result = applyOpenClawControlLayer(
      baseRequest({
        intent: 'notify',
        agent_role: 'researcher',
        context: { target_tenant_slug: 'another-tenant', tenant_governance_approved: true },
      })
    );
    expect(result.agent.role).toBe('researcher');
    expect(result.agent.tenant_permissions).toContain('cross-tenant-read');
  });
});

describe('tenant-aware permissions', () => {
  it('accepts valid tenant-aware payload', () => {
    expect(() =>
      assertTenantAwarePermissions(
        baseRequest({
          context: { tenant_slug: 'localrank' },
          metadata: { tenant_slug: 'localrank' },
        })
      )
    ).not.toThrow();
  });

  it('rejects metadata tenant mismatch', () => {
    expect(() =>
      assertTenantAwarePermissions(
        baseRequest({
          metadata: { tenant_slug: 'other-tenant' },
        })
      )
    ).toThrow(/metadata tenant mismatch/);
  });
});
