# Agent Lab Evidence Layer

**Scope:** records what happened when an agent executed a canonical task, captures
independent review, and tracks per-agent trust so promotion/demotion is measured,
not guessed. It does **not** create a second job registry, router, queue, or
agent identity store.

See `docs/00-architecture/AGENT-LAB-CAPABILITY-OWNERSHIP.md` for the full
capability → owner mapping this module was designed against.

## What this module is NOT

| If you need to... | Use this instead |
|---|---|
| Build a task | `buildAgentTaskEnvelope()` / `assignAgentTask()` — `lib/agent-task-core` |
| Look up an agent's capabilities/model | `config/external-agent-registry.json` (CLI agents) or `config/compute-workers.json` (PC-gamer) |
| Route a task to a worker | `routeAgentTask()` (`lib/external-agent-registry`) or `assignJob()` (`scripts/ops/compute-worker-router.mjs`) |
| Enqueue a task | `OrchestratorAgentTaskClient.enqueue()` (`local-agents` queue, ADR-048) |
| Check in-flight job status | Orchestrator Redis `JobState` (`apps/orchestrator/src/state/store.ts`) |

This module starts **after** all of the above: once a job has run, record the
outcome here, keyed by the same `request_id` the envelope carried.

## Quick Start

```typescript
import { buildAgentTaskEnvelope } from '@intcloudsysops/agent-task-core';
import { EvidenceStore } from '@intcloudsysops/agent-lab-evidence';

// 1. Canonical task, canonical enqueue (not shown — see lib/agent-task-core).
const envelope = buildAgentTaskEnvelope({
  task: 'Review video clip',
  tenantSlug: 'opsly-content',
  taskType: 'review',
  selectedAgent: 'ai.local.inference',
});

// 2. After the job completes, record it.
const store = new EvidenceStore();
store.registerAgent('pc-gamer-openclaw-01', 'shadow');

store.recordExecution({
  execution_id: 'EXE-1',
  request_id: envelope.request_id,
  agent_id: 'pc-gamer-openclaw-01',
  prompt_version: '1.0.0',
  input_hash: 'abc123',
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  latency_ms: 5000,
  output: { quality_score: 87 },
  tools_used: ['ollama:qwen3:14b'],
  resource_usage: { tokens_in: 1500, tokens_out: 150, vram_mb: 2048 },
  status: 'success',
});

// 3. Independent reviewer (builder != reviewer).
store.recordReview({
  review_id: 'REV-1',
  execution_id: 'EXE-1',
  reviewer_agent_id: 'codex-cli',
  reviewed_at: new Date().toISOString(),
  decision: 'approved',
  findings: [],
  score: 0.92,
});
```

## Trust Levels

`observe → shadow → supervised → trusted → autonomous_low_risk`

This is a **different axis** from AI Board's `AutomationLevel` (`lib/ai-board`),
which caps how risky an *action* is (peskids-support domain). Trust level tracks
an *agent's* earned track record across executions, independent of any single
action's blast radius.

Promotion/demotion is threshold-based and reversible:

```typescript
store.setPromotionPolicies([{
  from_level: 'shadow',
  to_level: 'supervised',
  minimum_tasks: 5,
  min_supervisor_agreement: 0.85,
  max_critical_failures: 0,
  min_success_rate: 0.9,
}]);

store.promoteIfEligible('pc-gamer-openclaw-01');
store.demoteIfDegraded('pc-gamer-openclaw-01'); // 3 consecutive failures or success_rate < 80%
```

## Example

```bash
npm run example
```

## Next Steps

1. Persist `EvidenceStore` behind the same interface (Supabase table or append-only
   log) once retention needs exceed process lifetime — do not fork a second store.
2. Wire `recordExecution`/`recordReview` into the Orchestrator's job-completion
   path so evidence is captured automatically, not manually.
3. Build evaluation sets (TRAIN/HOLDOUT) from accumulated `EvidenceRecord`s.
4. Model tournaments (shadow-compare Qwen/Gemma/Llama) consume this same store.
