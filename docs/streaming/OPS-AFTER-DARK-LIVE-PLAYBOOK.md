# Ops After Dark — Live Content & Mission Control Playbook

## Core concept

**I play. AI builds. We fix it live.**

Ops After Dark is a live format where gameplay provides entertainment while Opsly Mission Control exposes real software work in progress. AI agents explain architecture, investigate blockers, implement fixes, review evidence and narrate progress while the operator plays.

This is not a separate product from Mission Control. It is the live presentation layer and content format for the same canonical factory.

## Live loop

1. Gameplay stays primary.
2. Mission Control shows real factory state.
3. A blocker, PR, runtime event or architecture question appears.
4. AI Director assigns the right role.
5. The responsible agent investigates or executes.
6. QA / Evidence shows the result.
7. Reviewer verifies exact-head evidence.
8. The stream explains what changed in simple language.
9. Improvements discovered live JOIN_EXISTING the canonical Mission Control Live workstream.

## Audience layers

### Simple view
Show:
- what is being built;
- what is blocked;
- which agent is working;
- whether tests/review passed;
- what changes next.

### Technical view
Show when useful:
- branch;
- PR;
- worker;
- runtime;
- verifier;
- conflict key;
- exact-head SHA;
- QA/security/review state.

## AI crew

| Role | Live responsibility |
| --- | --- |
| ChatGPT — Host / Director | narrates, translates technical state for viewers, keeps the show moving |
| Claude — Architect | architecture discussion, tradeoffs, system design |
| OpenCode — Engineer | implementation and code repair |
| Qwen — Local Runtime | zero-cost local execution |
| Hermes — Supervisor | work coordination and policy |
| PR Doctor — Repair | detects and repairs PR/check failures |
| Reviewer — Verification | independent evidence and exact-head review |
| SRE Janitor — Cleanup | hygiene, stale branches, operational cleanup |

Agents must never pretend to be running, speaking or successful without evidence.

## Mission Control visual process

```
IDEA
  ↓
ARCHITECTURE
  ↓
TASK / CLAIM
  ↓
IMPLEMENTATION
  ↓
QA / EVIDENCE
  ↓
INDEPENDENT REVIEW
  ↓
MERGE
  ↓
DEPLOY
  ↓
OBSERVABILITY
```

The live page should make the active step obvious.

## QA / Evidence panel

Preferred live items:
- CI
- type-check
- unit/integration tests
- security
- independent review
- physical/runtime acceptance
- exact-head SHA
- evidence timestamp
- PASS / FAIL / BLOCKED / UNKNOWN

## Processes panel

Show:
- current work item;
- owner/agent;
- lane;
- worker/runtime;
- branch/PR;
- current lifecycle step;
- blocker;
- next governed transition.

## Stream scenes

### Gameplay + Mission Control
Gameplay large. Compact Mission Control overlay with current agents, blockers and process.

### Factory Focus
Mission Control / GitHub / terminal large. Gameplay secondary.

### Architecture
Architecture diagram + Claude/ChatGPT narration.

### QA / Repair
Checks, blockers, PR Doctor, reviewer evidence.

### Starting Soon / Intermission
Animated factory / agent crew / current mission.

## Game rotation

Games are chosen to support the show, not replace it.

| Game type | Best stream use |
| --- | --- |
| Battlefield / FPS | high-energy gameplay while AI crew narrates factory work |
| Call of Duty / Warzone | short rounds, easy pauses for Mission Control updates |
| Racing | visually entertaining while architecture/QA conversations run in parallel |
| Strategy / city-builder | strongest thematic fit for architecture, systems and factory discussion |
| Co-op / family game | community/family streams and lighter AI interaction |
| Retro / Astral Arena | direct bridge into Opsly Games development and live product testing |
| Sandbox/building game | useful for explaining software architecture through visual metaphors |

Do not lock the channel to one title. Rotate based on the type of software story happening that night.

## Tonight launch principle

The MVP only needs to make the concept understandable:
- gameplay;
- Mission Control Live;
- real blocker/process data;
- clear AI roles;
- QA/evidence;
- voice conversation;
- OBS projection.

Animation, voice event buses and deeper automation evolve live after launch.

## Canonical workstream

Issue #1692 owns the live format and launch.
PR #1691 owns the current Mission Control Live implementation.

All improvements that belong to this experience must JOIN_EXISTING unless a different canonical owner clearly exists.

## Tonight: temporary preview port (2026-10-01)

Canonical port `3001` is occupied by the `uptime-kuma` container (operator decision: do not stop/move it).

Admin dev server for tonight's `mode=dev` preview runs on `:4001` instead:

```
npm run dev --workspace=@intcloudsysops/admin -- -p 4001
```

OBS source should point at `http://127.0.0.1:4001/mission-control/live?mode=dev`, not `:3001`. This is a temporary, local-only override for tonight — `mission-control-live-preview.sh` still assumes `:3001` and needs a real fix (param or free port) as follow-up, not tonight.
