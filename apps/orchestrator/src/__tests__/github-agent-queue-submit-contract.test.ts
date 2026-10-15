import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const source = readFileSync(
  path.join(repoRoot, 'scripts/ops/github-agent-queue-submit.mjs'),
  'utf8'
);
const gamerAcceptanceWorkflow = readFileSync(
  path.join(repoRoot, '.github/workflows/gamer-opencode-physical-acceptance.yml'),
  'utf8'
);
const gamerAcceptanceWorkpack = readFileSync(
  path.join(repoRoot, 'docs/01-development/night-queue/050-gamer-opencode-physical-acceptance.md'),
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
    expect(source).toContain("agent_role: typedWrite ? 'executor' : 'review'");
    expect(source).toContain('agent: String(meta.agent)');
    expect(source).toContain('requires_pr: typedWrite ? true : false');
  });

  it('propagates pre-minted typed write approval only when OPSLY_GITHUB_AGENT_TYPED_WRITE is explicit', () => {
    expect(source).toContain("OPSLY_GITHUB_AGENT_TYPED_WRITE === 'true'");
    expect(source).toContain('OPSLY_GITHUB_AGENT_WRITE_APPROVAL_ID');
    expect(source).toContain('write_approval_ref:');
    expect(source).toContain("schema_version: 'AgentTaskWriteApprovalV1'");
    expect(source).toContain('approval_id: writeApprovalId');
    expect(source).not.toContain('mint_write_approval');
    expect(source).toContain('Propagate operator/admin pre-minted approval only');
    expect(source).toContain('OPSLY_GITHUB_AGENT_WRITE_PR_NUMBER');
    expect(source).toContain('OPSLY_GITHUB_AGENT_WRITE_PR_BRANCH');
    expect(source).toContain('OPSLY_GITHUB_AGENT_WRITE_PR_HEAD_SHA');
    expect(source).toContain('task_content_sha256: taskContentSha256');
    expect(source).toContain(
      "crypto.createHash('sha256').update(body, 'utf8').digest('hex')"
    );
    expect(source).toContain(
      'OPSLY_GITHUB_AGENT_TYPED_WRITE=true requires workpack requires_pr=true and requires_approval=true'
    );
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

  it('revalidates exact marker evidence for ALREADY_DONE acceptance reruns', () => {
    expect(source).toContain('ALREADY_DONE_REVALIDATE');
    expect(source).toContain('ALREADY_DONE_WITHOUT_JOB_EVIDENCE');
    expect(source).toContain('existingCompletedJobId || String(submit.body.job_id)');
  });

  it('Gamer physical acceptance is fixed to trusted main and the #050 read-only workpack', () => {
    expect(gamerAcceptanceWorkflow).toContain('workflow_dispatch:');
    expect(gamerAcceptanceWorkflow).toContain('runs-on: ubuntu-latest');
    expect(gamerAcceptanceWorkflow).not.toContain('self-hosted');
    expect(gamerAcceptanceWorkflow).toContain('ref: main');
    expect(gamerAcceptanceWorkflow).toContain(
      'docs/01-development/night-queue/050-gamer-opencode-physical-acceptance.md'
    );
    expect(gamerAcceptanceWorkflow).toContain(
      'OPSLY_GITHUB_AGENT_EXPECT_MARKER: GAMER_OPENCODE_OK'
    );
    expect(gamerAcceptanceWorkflow).not.toContain('${{ inputs.');
    expect(gamerAcceptanceWorkpack).toContain('agent: local_opencode');
    expect(gamerAcceptanceWorkpack).toContain('workstream: gamer-opencode-physical-acceptance');
    expect(gamerAcceptanceWorkpack).toContain('conflict_key: gamer-opencode-physical');
    expect(gamerAcceptanceWorkpack).toContain('requires_pr: false');
    expect(gamerAcceptanceWorkpack).toContain('production_deploy: false');
    expect(gamerAcceptanceWorkpack).toContain('paid_infra_required: false');
  });

  it('requires orchestrator URL and platform admin token instead of embedding credentials', () => {
    expect(source).toContain('OPSLY_ORCHESTRATOR_URL is required');
    expect(source).toContain('PLATFORM_ADMIN_TOKEN is required');
    expect(source).not.toMatch(/dp\.st\./);
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/);
  });
});

/**
 * Workpack 046 — AgentTask E2E contract hardening.
 * Source/contract assertions only; no second orchestrator and no runtime spawn.
 */
describe('AgentTask E2E contract hardening (046)', () => {
  it('1. governed GitHub workpacks cannot bypass /api/local/prompt-submit', () => {
    expect(source).toContain('Submitting ${meta.id} -> ${orchestratorUrl}/api/local/prompt-submit');
    expect(source).toMatch(
      /await request\(`\$\{orchestratorUrl\}\/api\/local\/prompt-submit`/
    );
    expect(source).not.toMatch(/\/api\/local\/prompt-submit\/bypass/);
    expect(source).not.toMatch(/enqueueLocalAgentJob/);
    expect(source).not.toMatch(/enqueueJob\(/);
  });

  it('2. submitter payload is shaped so the server builds AgentTaskEnvelopeV1', () => {
    // Body becomes the envelope task; submitter must not mint a parallel envelope.
    expect(source).toContain('AgentTaskEnvelopeV1.task');
    expect(source).toContain('prompt_body: body');
    expect(source).toContain('agent: String(meta.agent)');
    expect(source).toContain('tenant_slug: \'local\'');
    expect(source).not.toMatch(/agent_task:\s*\{/);
    expect(source).not.toContain("schema_version: 'AgentTaskEnvelopeV1'");
  });

  it('3. idempotency and request IDs are the same BullMQ-safe identity', () => {
    expect(source).toContain('const requestId = `ghq-${safeIdSegment(meta.id)}-${sha.slice(0, 12)}`');
    expect(source).toContain('request_id: requestId');
    expect(source).toContain('idempotency_key: requestId');
    expect(source).toContain('const writeClaimId = requestId');
  });

  it('4. paid / prod / approval-required workpacks fail closed without typed write', () => {
    expect(source).toContain('production_deploy=true is forbidden');
    expect(source).toContain('paid_infra_required=true is forbidden');
    expect(source).toContain('requires_approval=true is not eligible');
    expect(source).toContain('requires_pr=true is not eligible for autonomous GitHub dispatch yet');
    expect(source).toContain('estimated_cost_usd must be exactly 0');
    expect(source).toContain("['free','free_with_quota']");
  });

  it('5. terminal job states are surfaced to the submitter via /api/job-status', () => {
    expect(source).toContain('/api/job-status/');
    expect(source).toContain("['completed','done','success']");
    expect(source).toContain("['failed','error','cancelled']");
    expect(source).toContain('job ended in terminal state:');
    expect(source).toContain('job did not reach a terminal state within');
    expect(source).toContain('status.body.returnvalue ?? status.body.result ?? status.body.output');
    expect(source).toContain('JOIN_EXISTING_NONTERMINAL');
    expect(source).toContain('PREPARED_ONLY: orchestrator did not enqueue the task');
  });

  it('6. no BullMQ client or process spawn bypass exists in the submitter', () => {
    expect(source).not.toMatch(/from ['\"]bullmq['\"]/);
    expect(source).not.toMatch(/require\(['\"]bullmq['\"]\)/);
    expect(source).not.toMatch(/new Queue\(/);
    expect(source).not.toMatch(/spawn\(/);
    expect(source).not.toMatch(/spawnSync\(/);
    expect(source).not.toMatch(/execFile\(/);
    expect(source).not.toMatch(/child_process/);
  });

  it('7. canonical path stays a single orchestrator HTTP contract', () => {
    expect(source).toContain('OPSLY_ORCHESTRATOR_URL is required');
    expect(source).toContain("source: 'github-agent-queue'");
    expect(source).toContain("dispatch_contract_version: 'dispatch-claim-v1'");
    expect(source).not.toContain('second orchestrator');
    expect(source).not.toMatch(/startOrchestratorHealthServer/);
  });
});
