/**
 * EXAMPLE: Recording evidence for a canonical AgentTask execution.
 *
 * This does NOT create a new job store or a new queue. It shows the full
 * reused path:
 *
 *   1. Build the task with the canonical envelope builder (agent-task-core).
 *   2. Enqueue it the canonical way:
 *        - CLI/coding agents  -> OrchestratorAgentTaskClient (local-agents queue, ADR-048)
 *        - PC-gamer GPU/Ollama workers -> scripts/ops/compute-worker-router.mjs assignJob()
 *          (openclaw/content-video queues, config/compute-workers.json)
 *   3. Once the Orchestrator reports the job finished (JobState in Redis),
 *      record what happened here — execution, independent review, evidence.
 *
 * Run: npm run example
 */

import { buildAgentTaskEnvelope } from '@intcloudsysops/agent-task-core';
import { EvidenceStore } from '../src/index.js';
import type { ExecutionRecord, ReviewRecord, EvidenceRecord } from '../src/index.js';

async function main() {
  console.log('=== Agent Lab Evidence Layer — Example ===\n');

  // 1. Build the canonical task envelope (NOT a custom JobSpec).
  const envelope = buildAgentTaskEnvelope({
    task: 'Review video clip for HUD/caption overlap and compliance',
    tenantSlug: 'opsly-content',
    taskType: 'review',
    selectedAgent: 'ai.local.inference', // matches a jobType in config/compute-workers.json
    executionMode: 'dry_run',
    metadata: { video_url: 's3://opsly-content/videos/clip-001.mp4', duration_sec: 12 },
  });

  console.log(`✓ Built AgentTaskEnvelopeV1 request_id=${envelope.request_id}`);
  console.log('  (enqueue via OrchestratorAgentTaskClient or compute-worker-router assignJob — not shown here)\n');

  // 2. Evidence layer only starts here, after the canonical job ran.
  const store = new EvidenceStore();
  store.registerAgent('pc-gamer-openclaw-01', 'shadow'); // agent_id = workerId from compute-workers.json
  console.log('✓ Registered agent trust profile: pc-gamer-openclaw-01 (shadow)\n');

  const execution_id = `EXE-${Date.now()}-001`;
  const execution: ExecutionRecord = {
    execution_id,
    request_id: envelope.request_id,
    agent_id: 'pc-gamer-openclaw-01',
    prompt_version: '1.0.0',
    input_hash: Buffer.from(JSON.stringify(envelope.metadata)).toString('base64').slice(0, 16),
    started_at: new Date().toISOString(),
    completed_at: new Date(Date.now() + 5000).toISOString(),
    latency_ms: 5000,
    output: { quality_score: 87, captions_clear: true, hud_obscured: false, recommendation: 'APPROVE' },
    tools_used: ['ollama:qwen3:14b'],
    resource_usage: { tokens_in: 1500, tokens_out: 150, vram_mb: 2048 },
    status: 'success',
  };
  store.recordExecution(execution);
  console.log(`EXECUTION recorded for request_id=${execution.request_id}`);
  console.log(`  Output: ${JSON.stringify(execution.output)}\n`);

  // 3. Independent supervisor review (builder != reviewer).
  const review: ReviewRecord = {
    review_id: `REV-${Date.now()}-001`,
    execution_id,
    reviewer_agent_id: 'codex-cli',
    reviewed_at: new Date().toISOString(),
    decision: 'approved',
    findings: ['Good caption detection', 'HUD analysis accurate'],
    score: 0.92,
  };
  store.recordReview(review);
  console.log(`REVIEW by ${review.reviewer_agent_id}: ${review.decision} (score ${review.score})\n`);

  // 4. Evidence for future evaluation sets — no fine-tuning performed here.
  const evidence: EvidenceRecord = {
    evidence_id: `EV-${Date.now()}-001`,
    request_id: envelope.request_id,
    execution,
    review,
    final_result: execution.output,
    human_decision: 'approved',
    learning_lesson: 'qwen3:14b via Ollama on pc-gamer performs well on caption/HUD overlap detection',
    metrics: {
      worker_agreed_with_supervisor: true,
      worker_agreed_with_human: true,
      supervisor_agreed_with_human: true,
    },
  };
  store.recordEvidence(evidence);
  console.log('✓ Evidence recorded\n');

  console.log('AGENT SCORECARD:');
  console.log(JSON.stringify(store.getAgentScorecard('pc-gamer-openclaw-01'), null, 2));
}

main().catch(console.error);
