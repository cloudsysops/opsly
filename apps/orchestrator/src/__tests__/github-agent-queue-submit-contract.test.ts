import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../../..');
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

  it('is fail-closed to zero-cost read-only local OpenCode workpacks', () => {
    expect(source).toContain("meta.agent !== 'local_opencode'");
    expect(source).toContain("['free','free_with_quota']");
    expect(source).toContain('estimated_cost_usd must be exactly 0');
    expect(source).toContain('requires_pr=true is not eligible for autonomous GitHub dispatch yet');
    expect(source).toContain('requires_approval=true is not eligible');
    expect(source).toContain('production_deploy=true is forbidden');
    expect(source).toContain('paid_infra_required=true is forbidden');
    expect(source).toContain("agent_role: 'review'");
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

  it('reads the canonical BullMQ completed result and can require terminal completion', () => {
    expect(source).toContain('status.body.returnvalue ?? status.body.result ?? status.body.output');
    expect(source).toContain("OPSLY_GITHUB_AGENT_REQUIRE_COMPLETION === 'true'");
    expect(source).toContain('job did not reach a terminal state');
  });

  it('requires orchestrator URL and platform admin token instead of embedding credentials', () => {
    expect(source).toContain('OPSLY_ORCHESTRATOR_URL is required');
    expect(source).toContain('PLATFORM_ADMIN_TOKEN is required');
    expect(source).not.toMatch(/dp\.st\./);
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/);
  });
});
