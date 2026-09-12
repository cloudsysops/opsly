---
status: proposed
owner: platform
last_review: 2026-09-11
type: architecture
---

# External Agent Runtime Stack

## Principle

Opsly remains the control plane.

External agents are replaceable execution runtimes reached through explicit adapters/bridges. Do not embed or fork their source into Opsly and do not let them become a second orchestrator.

Canonical upstream manifest:

`config/external-agent-upstreams.json`

## Approved upstreams

| Runtime | Upstream | Opsly role | Required |
| --- | --- | --- | --- |
| Hermes Agent | `NousResearch/Hermes-Agent` | planning, review, decomposition | yes |
| OpenClaw | `openclaw/openclaw` | external agent/gateway runtime | yes |
| OpenCode | `anomalyco/opencode` | primary open-source coding builder | yes |
| Goose | `aaif-goose/goose` | general-purpose fallback | optional |

## Placement

### Mac — engineering workstation

Run:

- Claude Code
- Cursor
- OpenCode
- Hermes
- optional Goose
- Playwright
- OpenClaw CLI when an OpenClaw-specific task is required

Mac may:

- receive trusted engineering tasks;
- dispatch local CLI agents;
- create branches/commits/PRs.

Mac may not:

- directly write main;
- auto-deploy production;
- read unscoped secrets.

### PC Gamer — compute worker

Primary runtimes:

- Ollama/local inference;
- OpenClaw compute/device runtime where useful;
- ffmpeg/video/image workloads;
- embeddings/GPU jobs.

Do not install a full engineering write-capable agent fleet by default.

PC Gamer has no release authority and no production database credentials.

### VPS — control plane

Primary responsibilities:

- Opsly Orchestrator;
- BullMQ/Redis connectivity;
- policy;
- observability;
- runtime state.

Do not run write-capable builder agents on the VPS by default.

## Installation model

External source checkouts live outside Opsly:

`~/.opsly/external-agents`

or:

`OPSLY_EXTERNAL_AGENTS_HOME=/custom/path`

They are not Git submodules.

Bootstrap:

```bash
npm run superagents:install -- --clone
npm run superagents:install -- --install
npm run superagents:doctor
```

Start supported local bridges:

```bash
npm run superagents:install -- --start-bridges
```

Or all requested steps:

```bash
npm run superagents:install -- --all
```

Use `--dry-run` before first execution on each machine.

## Security boundary

Cloning source does not grant execution authority.

A runtime becomes usable only after:

1. trusted node enrollment;
2. unique node credential;
3. capability assignment;
4. bridge health check;
5. TaskSourceGuard provenance;
6. AgentTask policy;
7. independent review for merge.

Never put provider/API credentials in the upstream checkout.

## Hermes

There are two distinct concepts:

- external Hermes Agent CLI -> `hermes`, bridge `:5007`;
- Opsly Hermes orchestration module -> `apps/orchestrator/src/hermes`.

Do not conflate them.

## OpenClaw

OpenClaw is an external agent runtime/gateway.

Opsly already owns:

- tenant policy;
- job queues;
- AgentTask;
- approval gates;
- production governance.

OpenClaw must not replace those components.

Use:

```bash
npm run opsly:openclaw-cli -- --help
```

for the external CLI wrapper where installed.

## Activation states

Every runtime should be observable as:

- `not_installed`
- `installed`
- `bridge_down`
- `bridge_ready`
- `disabled_by_policy`
- `ready`

Do not equate "binary exists" with "authorized to execute".
