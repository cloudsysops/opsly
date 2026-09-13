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
4. `OPENCLAW_CONFIG_READONLY=1 OPENCLAW_OFFLINE=1 bash scripts/ops/openclaw-readonly-policy-doctor.sh` returns `OPENCLAW_READONLY_POLICY_READY`;
5. `local_openclaw` is enabled only inside the bounded temporary acceptance worker via `OPSLY_OPENCLAW_ACCEPTANCE_ENABLED=true`; the normal Mac worker remains unchanged;
6. the effective primary model is an exact local `ollama/<model>` reference with no configured fallbacks;
7. no production deploy or paid-provider fallback is required.

## Read-only policy requirement

Before the test, verify the effective OpenClaw profile blocks mutation-capable tools.

At minimum, the acceptance profile must not expose:

- `exec`;
- `process`;
- `write`;
- `edit`;
- `apply_patch`;
- browser/gateway lifecycle controls.

The acceptance policy must use `tools.allow: ["read"]`, explicitly deny mutation/runtime tools, use `workspaceAccess: ro|none`, `tools.exec.mode: deny`, and keep elevated mode disabled.

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

## Execution command

After the workpack is explicitly unheld and `local_openclaw` is enabled for the bounded acceptance window:

```bash
OPSLY_E2E_AGENT=openclaw \
OPSLY_E2E_EXPECT_MARKER=OPENCLAW_OK \
npm run opsly:mac:go-live
```

The strict runner must first obtain `OPENCLAW_READONLY_POLICY_READY` from the policy doctor. It then starts a temporary `local_openclaw`-only worker and destroys it on exit; no YAML/registry mutation is allowed.

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
6. the turn used the configured local `ollama/<model>` primary and no fallback;
7. the `opsly-task-*` session was destroyed;
8. healthy idle returned to zero AI task sessions.

## Hard boundaries

- No auto-install.
- No provider credential changes.
- No Gateway start/restart.
- No production mutation.
- No persistent OpenClaw agent process.
- No automatic registry enablement from this workpack.
