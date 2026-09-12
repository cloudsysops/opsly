import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '../..');
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
    expect(source).not.toMatch(/from ['"]bullmq['"]/);
    expect(source).not.toMatch(/new Queue\(/);
    expect(source).not.toMatch(/spawn\(/);
  });

  it('is fail-closed to zero-cost local OpenCode workpacks', () => {
    expect(source).toContain("meta.agent !== 'local_opencode'");
    expect(source).toContain("['free','free_with_quota']");
    expect(source).toContain('estimated_cost_usd must be exactly 0');
    expect(source).toContain('requires_approval=true is not eligible');
    expect(source).toContain('production_deploy=true is forbidden');
    expect(source).toContain('paid_infra_required=true is forbidden');
  });

  it('requires the canonical workpack directory and idempotent request identity', () => {
    expect(source).toContain("docs/01-development/github-agent-queue");
    expect(source).toContain('workpack must live under docs/01-development/github-agent-queue');
    expect(source).toContain('idempotency_key: requestId');
    expect(source).toContain('request_id: requestId');
    expect(source).toContain("source: 'github-agent-queue'");
  });

  it('requires orchestrator URL and platform admin token instead of embedding credentials', () => {
    expect(source).toContain('OPSLY_ORCHESTRATOR_URL is required');
    expect(source).toContain('PLATFORM_ADMIN_TOKEN is required');
    expect(source).not.toMatch(/dp\.st\./);
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/);
  });
});
