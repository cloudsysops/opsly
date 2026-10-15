# OBS Event Automation — Ops After Dark

Status: canonical design for live scene/overlay automation.

## Purpose

Mission Control Live must inform both:
- the operator while playing; and
- the audience watching the stream.

A meaningful software-factory event should become a safe, understandable visual signal without forcing the operator to watch GitHub continuously.

## Canonical flow

```
GitHub / Factory event
  ↓
typed internal event
  ↓
stream-safe projection
  ↓
deterministic scene policy
  ↓
OBS WebSocket adapter
  ↓
scene / overlay / sound cue
  ↓
operator + audience
```

This extends the existing Mission Control and streaming surfaces. It must not become a second orchestrator, scheduler, queue or source of truth.

## Event classes

### INFO
Examples:
- agent claimed work;
- test started;
- review started;
- worker heartbeat recovered.

Behavior:
- small overlay only;
- no forced scene change;
- optional subtle visual pulse;
- no disruptive audio.

### IMPORTANT
Examples:
- tests passed;
- tests failed;
- reviewer blocked;
- runtime recovered;
- PR became merge-ready.

Behavior:
- short animated overlay;
- optional short audio cue;
- side panel may expand temporarily;
- gameplay remains primary unless policy explicitly allows a temporary focus scene.

### CRITICAL / NEEDS_HUMAN
Examples:
- production approval required;
- governed action needs operator decision;
- repeated repair attempts exhausted;
- safety/policy gate blocked progress.

Behavior:
- persistent operator-visible alert;
- allowed temporary transition to Mission Control focus;
- explicit `NEEDS HUMAN` state;
- never auto-approve or infer approval from the scene change.

## Live metaphor + technical truth

Every public event may have two layers:

1. **Lore / metaphor** — entertaining language for the current game/theme.
2. **Technical explanation** — the real software event.

Example:

```
LORE: "Hull integrity anomaly detected"
REAL: Integration tests failed
LEARN: Integration tests verify that multiple parts of the system work together.
```

The metaphor must never replace or contradict the technical state.

## Initial event mapping

| Technical event | Public metaphor | Default class | OBS action |
| --- | --- | --- | --- |
| AGENT_RUNNING | Crew member entered station | INFO | pulse agent card |
| PR_BLOCKED | Docking gate blocked | IMPORTANT | QA/blocker overlay |
| TEST_PASS | Hull integrity restored | IMPORTANT | short success overlay |
| TEST_FAIL | Hull integrity fracture | IMPORTANT | repair/QA overlay |
| REVIEW_RUNNING | Oracle verification in progress | INFO | reviewer pulse |
| REVIEW_FAIL | Oracle rejected trajectory | IMPORTANT | repair focus panel |
| MERGE_READY | Jump authorized | IMPORTANT | merge-ready overlay |
| NEEDS_HUMAN | Captain intervention required | CRITICAL | persistent alert / optional focus scene |
| WORKER_OFFLINE | Auxiliary engine offline | IMPORTANT | runtime status overlay |
| WORKER_RECOVERED | Auxiliary engine restored | INFO | recovery pulse |

Game-specific metaphor packs may replace the lore text while keeping the same typed technical event.

## Scene policy

Scene changes are deterministic and policy-driven.

LLMs and agents may propose narration, but they do not directly control OBS scenes.

Rules:
- one event → one bounded transition;
- rate-limit repeated events;
- deduplicate identical event IDs;
- never loop scenes;
- CRITICAL alerts remain visible until acknowledged or state changes;
- INFO events never interrupt gameplay;
- scene automation must fail safe if OBS is unavailable;
- loss of OBS connectivity must not affect the software factory.

## OBS scenes

Recommended canonical scene names:

- `OAD_GAMEPLAY`
- `OAD_GAMEPLAY_MC_OVERLAY`
- `OAD_FACTORY_FOCUS`
- `OAD_ARCHITECTURE`
- `OAD_QA_REPAIR`
- `OAD_INTERMISSION`

Existing user OBS scenes should be preserved. The adapter should map canonical logical scene names to local OBS scene names rather than forcing a destructive reconfiguration.

## Multi-machine portability

Future content PCs must be able to reproduce the same behavior from versioned project configuration.

GitHub should own:
- logical scene definitions;
- event → action policy;
- overlay contracts;
- stream-safe rules;
- OBS adapter config template;
- setup/doctor scripts;
- machine capability requirements.

GitHub should not store:
- OBS WebSocket passwords;
- Twitch stream keys;
- access tokens;
- machine-local secrets;
- private tenant/customer identifiers.

Secrets remain local or in the approved secret manager.

## Stream-safe requirement

Every value shown in overlays must pass through the canonical stream-safe projection.

See:
- `docs/streaming/STREAM-SAFE-POLICY.md`
- `apps/admin/lib/mission-control-stream-safe-v1.ts`

No raw GitHub payload, terminal output, environment variable or internal log may be forwarded directly to OBS.

## Operator awareness

The same event that the audience sees should be visible to the operator.

Preferred mechanisms:
- overlay on stream preview;
- Mission Control alert card;
- optional short local sound cue for IMPORTANT/CRITICAL;
- persistent `NEEDS HUMAN` indicator.

This makes the live system useful operationally, not only decorative.

## Autopilot mode

When the operator is away:
- INFO and IMPORTANT events may render automatically;
- CRITICAL events stop at `NEEDS HUMAN`;
- no production deploy;
- no secret rotation;
- no DNS/routing mutation;
- no Peskids production mutation;
- no approval inference;
- no paid-provider fallback.

## Implementation phases

### Phase 1 — tonight
- Mission Control Live visible in OBS;
- stream-safe events;
- static logical scene mapping;
- manual scene switching remains available;
- visible event cards/overlays.

### Phase 2
- OBS WebSocket adapter;
- deterministic event policy;
- automatic overlay/scene transitions;
- local sound cues;
- event deduplication/rate limiting.

### Phase 3
- game-specific metaphor packs;
- narration/TTS event hooks;
- multi-machine setup script;
- OBS doctor/health checks;
- content-PC replication workflow.

## Invariant

Automation must make the show more observable without making production less safe.

A scene transition is presentation only. It is never authorization for a code, merge, deployment or production action.
