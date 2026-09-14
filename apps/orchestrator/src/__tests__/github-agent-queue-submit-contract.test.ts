import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveGovernedAgent } from '../../../../scripts/ops/lib/github-agent-queue-admission.mjs';

const repoRoot = path.resolve(__dirname, '../../../..');
const source = readFileSync(
  path.join(repoRoot, 'scripts/ops/github-agent-queue-submit.mjs'),
  'utf8'
);

describe('GitHub Agent Queue submitter contract', () => {
  it('dispatches only through the canonical governed local endpoint', () => {
    expect(source).toContain('/api/local/prompt-submit');
    expect(source).toContain('/api/job-status/');
    expect(source).toContain("authorization: `Bearer ${token}`");
    expect(source).toContain("'x-autonomy-approved': 'true'");
    expect(source).not.toMatch(/from ['\"]bullmq['\"]/);
    expect(source).not.toMatch(/new Queue\(/);
    expect(source).not.toMatch(/spawn\(/);
  });

  it('uses canonical registry admission instead of a hardcoded runtime allowlist', () => {
    expect(source).toContain("from './lib/github-agent-queue-admission.mjs'");
    expect(source).toContain('loadGovernedAgentRegistry(root)');
    expect(source).toContain('resolveGovernedAgent(meta, registry)');
    expect(source).toContain('agent: governedAgent.opslyJobType');
    expect(source).toContain('registry_worker_id: governedAgent.workerId');
    expect(source).toContain('registry_provider: governedAgent.provider');
    expect(source).toContain('registry_cost_class: governedAgent.costClass');
    expect(source).not.toContain("new Set(['local_opencode', 'local_hermes', 'local_openclaw'])");
  });

  it('keeps the queue zero-cost and non-mutating at the workpack boundary', () => {
    expect(source).toContain("['free','free_with_quota']");
    expect(source).toContain('estimated_cost_usd must be exactly 0');
    expect(source).toContain('requires_pr=true is not eligible for autonomous GitHub dispatch yet');
    expect(source).toContain('requires_approval=true is not eligible');
    expect(source).toContain('production_deploy=true is forbidden');
    expect(source).toContain('paid_infra_required=true is forbidden');
    expect(source).toContain("'task_type'");
    expect(source).toContain("agent_role: 'review'");
    expect(source).toContain('requires_pr: false');
  });

  it('requires explicit boolean safety flags so YAML comments cannot bypass policy', () => {
    expect(source).toContain("['requires_pr','requires_approval','production_deploy','paid_infra_required']");
    expect(source).toContain('must be an explicit YAML boolean without inline comments');
    expect(source).toContain("typeof meta[key] !== 'boolean'");
  });

  it('uses a BullMQ-safe idempotent request identity', () => {
    expect(source).toContain("docs/01-development/night-queue");
    expect(source).toContain('workpack must live under docs/01-development/night-queue');
    expect(source).toContain('const requestId = `ghq-${safeIdSegment(meta.id)}-${sha.slice(0, 12)}`');
    expect(source).toContain('idempotency_key: requestId');
    expect(source).toContain('request_id: requestId');
    expect(source).toContain("source: 'github-agent-queue'");
    expect(source).not.toContain('`ghq:${meta.id}:');
  });

  it('fails instead of pretending prepared-only work was queued', () => {
    expect(source).toContain('submit.body.prepared_only === true');
    expect(source).toContain('PREPARED_ONLY: orchestrator did not enqueue the task');
  });

  it('supports fast enqueue mode and optional terminal completion', () => {
    expect(source).toContain("OPSLY_GITHUB_AGENT_REQUIRE_COMPLETION === 'true'");
    expect(source).toContain('queued for governed parallel execution');
    expect(source).toContain('process.exit(0)');
    expect(source).toContain('status.body.returnvalue ?? status.body.result ?? status.body.output');
    expect(source).toContain('job did not reach a terminal state');
  });

  it('requires an ownership scope before dispatch and propagates it canonically', () => {
    expect(source).toContain("'workstream'");
    expect(source).toContain("'conflict_key'");
    expect(source).toContain("dispatch_contract_version: 'dispatch-claim-v1'");
    expect(source).toContain('workstream: String(meta.workstream)');
    expect(source).toContain('conflict_key: String(meta.conflict_key)');
    expect(source).toContain('semantic_scope: String(meta.semantic_scope || meta.conflict_key)');
    expect(source).toContain('affected_paths: listField(meta.affected_paths)');
    expect(source).toContain('depends_on: listField(meta.depends_on)');
    expect(source).toContain('DISPATCH_SCOPE_ALREADY_OWNED');
    expect(source).toContain('submit.body.dispatch_decision');
    expect(source).toContain("submit.body.dispatch_decision === 'JOIN_EXISTING'");
    expect(source).toContain("submit.body.dispatch_decision === 'ALREADY_DONE'");
    expect(source).toContain('JOIN_EXISTING_NONTERMINAL');
    expect(source).toContain('this submitter must not report success');
  });

  it('can require an exact terminal acceptance marker', () => {
    expect(source).toContain("OPSLY_GITHUB_AGENT_EXPECT_MARKER || ''");
    expect(source).toContain('completed job did not return the expected acceptance marker');
    expect(source).toContain('GITHUB_AGENT_QUEUE_MARKER_OK=');
    expect(source).toContain("for (const key of ['result', 'response', 'output', 'text'])");
  });

  it('requires orchestrator URL and platform admin token instead of embedding credentials', () => {
    expect(source).toContain('OPSLY_ORCHESTRATOR_URL is required');
    expect(source).toContain('PLATFORM_ADMIN_TOKEN is required');
    expect(source).not.toMatch(/dp\.st\./);
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/);
  });
});


describe('GitHub Agent Queue executable registry admission', () => {
  const worker = (overrides: Record<string, unknown> = {}) => ({
    kind: 'external-binary',
    adapter: 'agent-binary-http-bridge',
    opsly_job_type: 'local_hermes',
    enabled: true,
    local: true,
    write_access: false,
    provider: 'hermes',
    supported_task_types: ['research', 'planning'],
    github_queue: {
      eligible: true,
      read_only: true,
      provider_approved: true,
      cost_class: 'free_with_quota',
    },
    ...overrides,
  });

  const meta = (overrides: Record<string, unknown> = {}) => ({
    agent: 'hermes-cli',
    task_type: 'research',
    cost_class: 'free_with_quota',
    ...overrides,
  });

  it('resolves by worker id and canonical opsly job type', () => {
    const registry = { workers: { 'hermes-cli': worker() } };
    expect(resolveGovernedAgent(meta(), registry)).toMatchObject({
      workerId: 'hermes-cli',
      opslyJobType: 'local_hermes',
      taskType: 'research',
    });
    expect(resolveGovernedAgent(meta({ agent: 'local_hermes' }), registry)).toMatchObject({
      workerId: 'hermes-cli',
      opslyJobType: 'local_hermes',
    });
  });

  it('rejects write-capable entries even when registry policy is accidentally marked eligible', () => {
    const registry = { workers: { 'writer-cli': worker({
      opsly_job_type: 'local_opencode',
      write_access: true,
    }) } };
    expect(() => resolveGovernedAgent(meta({ agent: 'writer-cli' }), registry))
      .toThrow(/write-capable/);
  });

  it('rejects missing provider approval, unknown cost and free/quota mismatches', () => {
    const providerBlocked = { workers: { 'hermes-cli': worker({
      github_queue: {
        eligible: true,
        read_only: true,
        provider_approved: false,
        cost_class: 'free_with_quota',
      },
    }) } };
    expect(() => resolveGovernedAgent(meta(), providerBlocked)).toThrow(/provider is not approved/);

    const unknownCost = { workers: { 'hermes-cli': worker({
      github_queue: {
        eligible: true,
        read_only: true,
        provider_approved: true,
        cost_class: 'unknown',
      },
    }) } };
    expect(() => resolveGovernedAgent(meta(), unknownCost)).toThrow(/non-zero\/unknown/);

    const quotaWorker = { workers: { 'hermes-cli': worker() } };
    expect(() => resolveGovernedAgent(meta({ cost_class: 'free' }), quotaWorker))
      .toThrow(/incompatible with free workpack/);
  });

  it('rejects unsupported or missing task types', () => {
    const registry = { workers: { 'hermes-cli': worker() } };
    expect(() => resolveGovernedAgent(meta({ task_type: 'code' }), registry))
      .toThrow(/does not support task_type/);
    expect(() => resolveGovernedAgent(meta({ task_type: '' }), registry))
      .toThrow(/task_type/);
  });

  it('fails closed for unknown, disabled and non-local workers', () => {
    const registry = { workers: { 'hermes-cli': worker() } };
    expect(() => resolveGovernedAgent(meta({ agent: 'missing-cli' }), registry))
      .toThrow(/not registered/);
    expect(() => resolveGovernedAgent(meta(), {
      workers: { 'hermes-cli': worker({ enabled: false }) },
    })).toThrow(/disabled/);
    expect(() => resolveGovernedAgent(meta(), {
      workers: { 'hermes-cli': worker({ local: false }) },
    })).toThrow(/not eligible for governed local dispatch/);
  });
});
