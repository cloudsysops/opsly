# Software Factory Telemetry v1

Telemetry v1 is the first feedback layer for the Software Factory.

Inputs:

- Mission Control factory-workstreams snapshot;
- canonical PR reconciliation inventory.

Outputs include:

- active claims;
- live runtime sessions;
- verifier coverage;
- merge-ready and blocked ratios;
- behind/conflicted/check-failed backlogs;
- deterministic next-action recommendations.

## Learning boundary

V1 is **observe and recommend**, not self-modifying intelligence.

It does not change:

- routing weights;
- model selection;
- concurrency;
- merge policy;
- repair policy.

Persistent history and adaptive policy changes remain a later explicit layer so Mission Control never claims the system is learning before durable evidence exists.


## Canonical learning integration

The learning owner already exists: `@intcloudsysops/agent-learning`.

Factory telemetry must **not** introduce a new learning database or use a PR number / workpack `work_id` as an alternative learning identity. The canonical learning key is:

```text
AgentTaskEnvelopeV1.request_id
```

The remaining integration gaps are therefore explicit:

1. propagate canonical `request_id` through execution evidence into the Mission Control factory read model;
2. expose Agent Learning scorecards in Mission Control;
3. add continuous durable eval/evidence export.

Until those exist, Telemetry reports `OBSERVE_AND_RECOMMEND` and never claims adaptive learning.
