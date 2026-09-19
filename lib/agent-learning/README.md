# @intcloudsysops/agent-learning

Agent Lab **learning** layer — not a task registry.

Attaches evidence / review / trust / scorecards / eval datasets to canonical
`AgentTaskEnvelopeV1.request_id` (`task_id`). It also owns the bounded handoff
contract used to prove that material agent work can be safely continued or closed.

## Do

```ts
import {
  AgentLearningStore,
  assertWorkClosureV1,
  refuseIndependentTaskCreation,
  taskIdFromEnvelope,
} from '@intcloudsysops/agent-learning';
import { assignAgentTask } from '@intcloudsysops/agent-task-core';

// 1) Create tasks only via agent-task-core
const { envelope } = await assignAgentTask({ task: '…', tenantSlug: 'platform' });
const taskId = taskIdFromEnvelope(envelope);

// 2) After worker runs, attach evidence/learning to envelope.request_id
const store = new AgentLearningStore();
store.attachExecutionEvidenceV1({ request_id: taskId, task_id: taskId, /* … */ });

// 3) Before material work transitions to READY_TO_MERGE/MERGED/CLEANED,
// require evidence + validation + documentation writeback when durable knowledge changed.
assertWorkClosureV1({ request_id: taskId, /* work-handoff-v1 … */ });
```

## Closure evidence invariant

Every attempt, including failed/retryable attempts, must emit a `work-handoff-v1`
record with canonical request/work identity and at least one execution evidence id.
Successful closure (`ready_to_merge`, `merged`, `cleaned`) additionally requires
validation evidence. If the work changed durable knowledge, closure also requires
at least one canonical documentation/Brain reference. `retryable` attempts must
state their blocker so the next worker can continue rather than rediscover context.

The contract redacts obvious bearer tokens, token/password/secret assignments and
JWT-shaped values before the handoff is accepted. It does not replace runtime
secret handling; agents still must not write secrets into evidence.

## Do not

- Call `refuseIndependentTaskCreation` — it always throws by design.
- Mint a parallel `job_id` or evidence store.
- Treat a chat summary as machine evidence.
- Mark material work closed while `checkWorkClosureV1(...).allowed` is false.
- Auto-promote to `autonomous_low_risk` (blocked in `promoteIfEligible`).

Canon: `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md` and
`docs/03-agents/AGENT-BRAIN-CONTRACT.md`.
