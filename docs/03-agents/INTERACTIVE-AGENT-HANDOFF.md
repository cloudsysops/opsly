# Interactive Agent Handoff

This adapter lets a human-started subscription chat (for example ChatGPT, Claude, or an interactive Cursor session) participate in the Opsly Software Factory without pretending that the chat is an autonomous BullMQ worker.

## Boundary

```text
canonical workpack / claim
        ↓
interactive-agent-handoff.mjs
        ↓
portable session brief
        ↓
human starts subscription chat
        ↓
agent works on owned branch / PR
        ↓
completion evidence returns to GitHub / Mission Control
```

The adapter does **not**:
- create another task store;
- enqueue BullMQ jobs;
- access a subscription account;
- persist chat transcripts;
- bypass approvals;
- grant production authority.

## Usage

```bash
node scripts/ops/interactive-agent-handoff.mjs docs/01-development/github-agent-queue/<workpack>.md
```

Write a portable brief:

```bash
node scripts/ops/interactive-agent-handoff.mjs <workpack.md> --out /tmp/opsly-handoff.md
```

Paste the resulting brief into the human-started chat. The session must return bounded completion evidence (work id, status, branch, commit, PR, checks, blockers and follow-up).

## Why this is separate from autonomous dispatch

Autonomous local runtimes use `AgentTaskEnvelopeV1 → Orchestrator → BullMQ → Session Manager → ephemeral runtime`.

Human-started subscription chats cannot be assumed to expose a stable authenticated machine API. Treating them as BullMQ workers would invent capabilities we do not control. They therefore use a **human_relay transport**, while GitHub/Opsly still owns work identity, claims, policy and evidence.

## Future

Mission Control should display these sessions as `human-driven` / `interactive_subscription` and distinguish them from autonomous runtimes. A future connector may automate handoff delivery where a provider exposes a supported API, but the canonical work/evidence contracts remain unchanged.
