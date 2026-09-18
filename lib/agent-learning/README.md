# @intcloudsysops/agent-learning

Agent Lab **learning** layer — not a task registry.

Attaches evidence / review / trust / scorecards / eval datasets to canonical
`AgentTaskEnvelopeV1.request_id` (`task_id`).

## Do

```ts
import {
  AgentLearningStore,
  refuseIndependentTaskCreation,
  taskIdFromEnvelope,
} from '@intcloudsysops/agent-learning';
import { assignAgentTask } from '@intcloudsysops/agent-task-core';

// 1) Create tasks only via agent-task-core
const { envelope } = await assignAgentTask({ task: '…', tenantSlug: 'platform' });
const taskId = taskIdFromEnvelope(envelope);

// 2) After worker runs, attach learning to envelope.request_id
const store = new AgentLearningStore(); // loads DEFAULT_PROMOTION_POLICIES
store.attachExecution({ task_id: taskId, /* … */ });
store.attachReview({ task_id: taskId, /* … */ });
store.attachHumanDecision({ task_id: taskId, decision: 'approved' });
store.promoteIfEligible('agent-id');
store.getPromptPerformance();
store.getModelPerformance();
```

## Do not

- Call `refuseIndependentTaskCreation` — it always throws by design.
- Mint a parallel `job_id` store (see superseded `lib/agent-job-registry` on PR #1185).
- Auto-promote to `autonomous_low_risk` (blocked in `promoteIfEligible`).

Canon: `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md`
