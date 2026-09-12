# @intcloudsysops/agent-learning

Agent Lab **learning** layer — not a task registry.

Attaches evidence / review / trust / scorecards to canonical
`AgentTaskEnvelopeV1.request_id` (`task_id`).

## Do

```ts
import { AgentLearningStore, refuseIndependentTaskCreation } from '@intcloudsysops/agent-learning';
import { assignAgentTask } from '@intcloudsysops/agent-task-core';

// 1) Create tasks only via agent-task-core
const { envelope } = await assignAgentTask({ task: '…', tenantSlug: 'platform' });

// 2) After worker runs, attach learning to envelope.request_id
const store = new AgentLearningStore();
store.attachExecution({ task_id: envelope.request_id, /* … */ });
```

## Do not

- Call `refuseIndependentTaskCreation` — it always throws by design.
- Mint a parallel `job_id` store (see superseded `lib/agent-job-registry` on PR #1185).

Canon: `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md`
