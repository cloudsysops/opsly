---
id: openclaw-physical-acceptance-052
status: held
priority: P1
agent: local_openclaw
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: false
requires_approval: true
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 15
resource_class: small
node_types: mac
blocked_by: openclaw-runtime-policy-and-physical-readiness
architecture_patterns: AgentTaskEnvelopeV1, OpenClaw agent exec, Session Manager, ephemeral runtime
---

# OpenClaw Physical Acceptance

## Goal

Prove the real external OpenClaw CLI can execute through the canonical Opsly runtime boundary and tear down cleanly.

## Hold condition

Do not unhold this workpack until all of the following are true:

1. the existing Mac self-hosted runner is online;
2. Doppler/bridge auth prerequisites are green;
3. the installed OpenClaw version supports `openclaw agent exec`;
4. OpenClaw effective tool policy for the acceptance run is explicitly read-only;
5. `local_openclaw` is enabled only for the bounded acceptance window;
6. no production deploy or paid-provider fallback is required.

## Read-only policy requirement

Before the test, verify the effective OpenClaw profile blocks mutation-capable tools.

At minimum, the acceptance profile must not expose:

- `exec`;
- `process`;
- `write`;
- `edit`;
- `apply_patch`;
- browser/gateway lifecycle controls.

Prefer an allowlist containing only the read capability for this smoke.

Do not assume `agent exec` is read-only by default.

## Canonical path

```text
AgentTaskEnvelopeV1
→ BullMQ local-agents
→ explicitly enabled local_openclaw
→ authenticated bridge :5012
→ Session Manager
→ ephemeral opsly-task-* tmux session
→ openclaw agent exec
→ bounded final result
→ teardown
```

## Task

Run a bounded inspection that does not edit the repository and return exactly:

`OPENCLAW_OK`

## Acceptance

All must be proven:

1. the task selected `local_openclaw` intentionally;
2. the bridge reports auth configured and `ephemeral-tmux-session`;
3. OpenClaw ran through `agent exec`, not Gateway/TUI;
4. terminal result is exactly `OPENCLAW_OK`;
5. no file mutation occurred;
6. no paid-provider fallback occurred unless explicitly pre-approved for this test;
7. the `opsly-task-*` session was destroyed;
8. healthy idle returned to zero AI task sessions.

## Hard boundaries

- No auto-install.
- No provider credential changes.
- No Gateway start/restart.
- No production mutation.
- No persistent OpenClaw agent process.
- No automatic registry enablement from this workpack.
