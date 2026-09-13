import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('is fail-closed to approved zero-cost governed local runtimes', () => {
    expect(source).toContain("new Set(['local_opencode', 'local_hermes', 'local_openclaw'])");
    expect(source).toContain("['free','free_with_quota']");
    expect(source).toContain('estimated_cost_usd must be exactly 0');
    expect(source).toContain('requires_pr=true is not eligible for autonomous GitHub dispatch yet');
    expect(source).toContain('requires_approval=true is not eligible');
    expect(source).toContain('production_deploy=true is forbidden');
    expect(source).toContain('paid_infra_required=true is forbidden');
    expect(source).toContain("agent_role: 'review'");
    expect(source).toContain('agent: String(meta.agent)');
    expect(source).toContain('requires_pr: false');
  });

  it('requires explicit boolean safety flags so YAML comments cannot bypass policy', () => {
    expect(source).toContain("['requires_pr','requires_approval','production_deploy','paid_infra_required']");
    expect(source).toContain('must be an explicit YAML boolean without inline comments');
    expect(source).toContain("typeof meta[key] !== 'boolean'");
  });

  it('uses a BullMQ-safe idempotent request identity', () => {
    expect(source).toContain("docs/01-development/github-agent-queue");
    expect(source).toContain('workpack must live under docs/01-development/github-agent-queue');
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

  it('propagates workstream metadata for conflict/dependency scheduling', () => {
    expect(source).toContain('workstream: meta.workstream || null');
    expect(source).toContain('conflict_key: meta.conflict_key || null');
    expect(source).toContain('depends_on: meta.depends_on || null');
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
