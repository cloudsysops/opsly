# Mission Control Fleet Explorer — Spatial Machine Intelligence

Status: product/design contract for the existing Mission Control stack  
Primary implementation lane: PR #1542  
Telemetry companion: PR #1543  
Physical worker acceptance: #1591  
Control principle: one control plane, one runtime truth, no fabricated green state

## Product intent

Mission Control must make the Opsly architecture understandable from one screen.

The operator can zoom out to see the entire system, zoom into one machine, then continue drilling into containers, agents, jobs, processes, logs and execution evidence without losing architectural context.

The experience should feel like a modern AI infrastructure cockpit rather than a traditional server table.

The UI must distinguish clearly between:

- control-plane nodes;
- local/runtime nodes;
- GPU compute workers;
- cloud/data services;
- queues;
- containers;
- agents/runtimes;
- jobs;
- evidence;
- protected or unavailable surfaces.

No visual state may imply health, connectivity, activity or AI execution unless a canonical runtime source reports it.

## Existing canonical surfaces to reuse

Do not build a second monitoring stack.

Current surfaces already cover most of the read model:

- `/api/admin/compute-workers` — worker identity, ONLINE/BUSY/DEGRADED/OFFLINE, GPU model, VRAM, jobs, heartbeat, capabilities and queue snapshot.
- `/api/runtime/nodes/status` — runtime nodes, Redis connectivity, CPU/RAM and tmux/session state.
- `/api/admin/docker/resources` — container resource detail from the existing Mission Control system lane.
- `/api/admin/mission-control/orchestrator` — orchestrator/queue state.
- `/api/admin/mission-control/openclaw` — governed intent/runtime information.
- `/api/admin/mission-control/execution-sources` — execution-source truth where available.
- PR #1543 adds the deeper process/agent resource layer and richer compute telemetry; consume it when that layer is reconciled, do not duplicate it.

UI libraries already available in `apps/admin`:

- `@xyflow/react` for spatial topology/zoom;
- `recharts` for resource trends;
- `zustand` for explorer selection/zoom state;
- `lucide-react` for consistent technical iconography;
- Tailwind/Radix for interaction, overlays and accessibility.

## Experience model

### Level 0 — Fleet / Architecture

Default page: `/mission-control`.

Show the architecture as a spatial topology canvas:

```
GitHub ───────┐
              ▼
Mac ──────► Opsly Control Plane ◄──── Data / services
              │
       canonical queue
              │
       ┌──────┴────────┐
       ▼               ▼
home-gpu-01      pc-gamer-openclaw-01
```

Each machine is a compact live card, not a plain graph node.

The operator must be able to:

- pan;
- zoom;
- fit all;
- filter by role/state/capability;
- click one machine;
- see connection paths highlighted;
- see queue/job flow;
- see which observations are REAL, DERIVED or UNKNOWN.

Connections should communicate meaning:

- cyan: control/telemetry;
- violet: job/queue dispatch;
- emerald: healthy runtime path;
- amber: degraded/busy/draining;
- red: broken/offline;
- dotted: configured/planned but not proven live.

### Level 1 — Machine card

Every machine card follows one visual grammar.

Header:

- machine identity;
- role/class;
- status;
- heartbeat age;
- confidence/source badge.

Primary telemetry:

- CPU usage;
- RAM used/total;
- GPU usage;
- VRAM used/total;
- GPU temperature;
- disk free;
- active jobs.

Identity/capabilities:

- OS/runtime;
- worker class: opportunistic / controlled / always_on;
- GPU model;
- Tailscale/private reachability when canonically observed;
- capability chips.

Example:

```
┌────────────────────────────────────────────┐
│ home-gpu-01     OPPORTUNISTIC       ONLINE │
│ RTX 3060 12 GB · WSL2 · heartbeat 8s       │
│                                            │
│ CPU  31%   RAM 21/48 GB   Disk 420 GB free│
│ GPU  42%   VRAM 4.8/12 GB Temp 58°C       │
│                                            │
│ ● Ollama  ● Worker  ● FFmpeg  ● Whisper   │
│ job: content.render.video                  │
│ mode: OPSLY                                │
└────────────────────────────────────────────┘
```

### Level 2 — Machine explorer

Route:

`/mission-control/machines/[workerId]`

The machine opens as a full-screen spatial detail view while preserving a breadcrumb back to the full topology.

Tabs/panels:

1. Overview
2. Resources
3. Containers
4. Agents & Processes
5. Jobs
6. Models
7. Network
8. Events & Evidence

#### Overview

Show:

- machine/worker ID;
- hostname;
- role/class;
- OS/runtime;
- uptime;
- last heartbeat;
- capability set;
- current mode;
- current job;
- runtime source/confidence.

#### Resources

Live gauges + trends:

- CPU %;
- system RAM used/total;
- GPU utilization %;
- VRAM used/total;
- temperature;
- GPU power if available;
- disk;
- network Rx/Tx;
- 5m / 1h / 24h windows when historical source exists.

Do not fake history from one current sample.

#### Containers

Show each observed container as a sub-card:

- name;
- image/tag;
- RUNNING/STOPPED/DEGRADED;
- CPU;
- memory;
- network I/O;
- block I/O;
- PID count;
- restart count where available;
- health state;
- ports only when canonical source exposes them.

Clicking a container drills further without leaving the machine context.

#### Agents & Processes

Separate catalog from live execution.

For each live process/runtime:

- agent/runtime name;
- PID/session;
- CPU;
- RSS/RAM;
- state;
- current task/work_id/request_id if observed;
- branch/PR if observed;
- started-at/duration;
- evidence state.

Never show Claude/Codex/Hermes/OpenClaw as RUNNING solely because the runtime is installed.

#### Jobs

Show:

- queue;
- job/task/work/request identity;
- worker claim;
- start/duration;
- active/completed/failed/retryable state;
- failure class;
- related PR;
- evidence IDs;
- next safe action.

#### Models

For Ollama/local inference:

- installed model inventory;
- model size;
- loaded/unloaded;
- VRAM residency if observed;
- current model;
- latency/tokens-per-second only when measured;
- last use.

Model availability is a machine capability. Do not require every machine to hold every LLM.

#### Network

Show only observed data:

- private/Tailscale identity;
- reachability;
- control-plane peer/path;
- registered service endpoints;
- latency when measured.

Never expose credentials or secrets.

#### Events & Evidence

Timeline:

- heartbeat;
- ONLINE/OFFLINE;
- BUSY;
- DRAINING;
- GAMING;
- DEGRADED;
- reboot/recovery;
- job claimed;
- job completed;
- retry/requeue;
- container health transitions;
- evidence attached.

## Machine states

The visual state model should support:

- ONLINE — live and eligible;
- BUSY — executing or resource threshold reached;
- DRAINING — accepts no new work while in-flight work exits safely;
- GAMING — owner-reserved; no heavy GPU dispatch;
- DEGRADED — live but health/resource condition is unsafe or constrained;
- OFFLINE — stale/missing heartbeat after threshold;
- UNKNOWN — insufficient canonical evidence.

Current API states remain backward compatible. DRAINING/GAMING may initially be represented as explicit mode metadata until the canonical runtime state contract is extended.

## Gaming-aware behavior

For `home-gpu-01` and other owner-used machines:

```
AVAILABLE
  ↓ owner gaming / policy trigger
DRAINING
  ↓ no new heavy jobs
GAMING
  ↓ owner finishes
COOLDOWN
  ↓ telemetry stable
AVAILABLE
```

Mission Control must make this visually obvious so the operator knows why capacity disappeared without treating the machine as failed.

## Futuristic visual system — BLACK HACKER OPS

Design direction: **black-first, elite hacker/AI operations console**. The interface should feel like a sovereign cyber-operations cockpit built for real infrastructure: sharp, quiet, dangerous-looking, highly legible and evidence-driven. Avoid retro parody, Matrix rain, fake terminals or excessive neon.

### Surface

- true black / near-black background (`#020304` family), not blue-gray;
- layered black surfaces with tiny luminance differences instead of bright cards;
- subtle 24–32px technical grid and sparse circuit traces;
- faint scanline/noise texture at very low opacity;
- machine cards use smoked-glass black with hairline borders;
- selected/live entities get restrained phosphor-green edge light;
- inactive/unobserved entities recede almost completely into black;
- topology space should feel deep, with controlled bloom around live paths only;
- no gratuitous animation, no decorative cyberpunk clutter.

### Hacker semantic accents

Primary visual language is monochrome black + phosphor green.

- phosphor green: canonical live state, verified telemetry, active links, successful evidence;
- electric green: selected machine / active AI path;
- dim green-gray: configured/idle;
- amber: BUSY / DRAINING / GAMING / constrained;
- red: failure / OFFLINE / rejected / policy violation;
- ice-cyan: control-plane metadata only, used sparingly;
- violet: AI/model-specific context only, used sparingly;
- graphite/slate: UNKNOWN / planned / unobserved.

Never use color merely for decoration. Color must encode operational meaning.

### Machine cards

Cards should resemble high-end black tactical instrumentation:

- machine ID is the dominant label;
- live status lamp + heartbeat age in the header;
- CPU / RAM / GPU / VRAM shown as precise compact meters;
- tiny sparklines only when real history exists;
- GPU temperature and power shown as instrument readouts;
- container, agent and capability chips look like terminal modules;
- current job appears as an active command/execution strip;
- card edges illuminate only when selected, busy or receiving work.

### Typography

- machine IDs and critical telemetry: condensed technical display style;
- operator labels: clean sans-serif;
- identifiers, SHAs, PIDs, ports, queue names, model tags and commands: monospace;
- avoid oversized marketing typography inside operational views;
- numbers should align like instrumentation.

### Topology links

Links should look like live signal paths rather than decorative arrows:

- verified telemetry/control path: thin phosphor-green line;
- active dispatch/job: brighter animated green pulse;
- data/evidence path: dim cyan/green;
- degraded: amber broken/pulsing line;
- offline: muted red;
- configured but not observed: dotted graphite.

When a machine is selected, dim unrelated paths and illuminate its dependency chain from GitHub/queue/control-plane to runtime/evidence.

### Motion

Motion communicates machine state only:

- heartbeat: subtle single-pixel/ring pulse;
- active job: slow packet/signal travel along the real edge;
- selection: fast focus lock;
- zoom: smooth camera transition;
- new evidence: brief green acknowledgement flash;
- BUSY/DRAINING/GAMING transition: restrained amber state shift;
- failure: one red alert pulse, then static.

Respect reduced-motion preferences.

### Hacker interaction details

- global command/search bar should feel like a command palette, e.g. `> inspect home-gpu-01`;
- keyboard-first navigation is first-class;
- contextual inspector can expose copyable IDs/commands without exposing secrets;
- optional compact terminal-style event stream can sit at the bottom of the canvas;
- AI explanations appear as an operator copilot panel, not a chatbot bubble;
- evidence/confidence badges should resemble forensic verification markers: `REAL`, `DERIVED`, `UNKNOWN`.

### Visual quality bar

The target is closer to a premium cyber-defense / GPU-cluster / AI-lab console than a generic SaaS dashboard.

Do:
- black space;
- disciplined green;
- crisp hierarchy;
- dense but calm telemetry;
- spatial depth;
- precise micro-interactions.

Do not:
- Matrix code rain;
- skulls, fake exploit text or cliché hacker graphics;
- rainbow neon;
- glowing every border;
- fake command output;
- decorative telemetry;
- inaccessible low-contrast green-on-black text.

## AI layer — explain, discriminate, diagnose

The AI layer must add operational understanding, not fake certainty.

A contextual AI sidecar can answer from the current canonical snapshot:

- “Why is this machine BUSY?”
- “What is consuming the GPU?”
- “Which container is using RAM?”
- “Which agent owns this process?”
- “Why did this node go DEGRADED?”
- “Where can this queued job run?”
- “What changes if I take this machine offline?”
- “Show only machines capable of local inference.”
- “Explain this architecture to me.”

Every AI statement should carry evidence/source references and confidence.

AI must distinguish:

- configured vs observed;
- installed vs running;
- reachable vs eligible;
- healthy vs idle;
- runtime state vs policy permission;
- worker capacity vs current availability.

The AI sidecar is read-only in the first implementation lane. Mutating actions remain governed and separate.

## Interaction design

Desktop:

- left rail: Fleet, queues, filters and search;
- center: spatial architecture canvas;
- right inspector: selected machine/container/agent/job;
- bottom optional event/evidence timeline.

Mobile/tablet:

- fleet cards first;
- tap card -> machine explorer;
- topology becomes fit-to-screen with simplified edges;
- inspector uses bottom sheet.

Keyboard:

- `/` search;
- `F` fit topology;
- `Esc` zoom out one level;
- arrows/tab cycle nodes;
- Enter opens selected node.

## Data contract evolution

Extend canonical compute/runtime telemetry rather than introducing another store.

Desired machine telemetry fields where available:

```ts
type MachineTelemetryV1 = {
  observedAt: string;
  workerId: string;
  hostname: string;
  mode?: 'OPSLY' | 'DRAINING' | 'GAMING' | 'COOLDOWN';
  cpuPercent?: number;
  ramUsedGb?: number;
  ramTotalGb?: number;
  diskFreeGb?: number;
  networkRxBps?: number;
  networkTxBps?: number;
  gpuVendor?: string;
  gpuModel?: string;
  gpuPercent?: number;
  vramUsedGb?: number;
  vramTotalGb?: number;
  temperatureC?: number;
  gpuPowerW?: number;
  activeJobs?: number;
};
```

No field should be synthesized when the source is absent.

## Architecture graph model

Create a derived read-only topology projection from existing sources:

```ts
type FleetTopologyNodeV1 =
  | ControlPlaneNode
  | RuntimeNode
  | ComputeWorkerNode
  | ExternalServiceNode
  | QueueNode;

type FleetTopologyEdgeV1 = {
  id: string;
  source: string;
  target: string;
  kind: 'CONTROL' | 'TELEMETRY' | 'DISPATCH' | 'DATA' | 'EVIDENCE';
  state: 'LIVE' | 'DEGRADED' | 'UNKNOWN';
  confidence: 'REAL' | 'DERIVED' | 'UNKNOWN';
};
```

This projection is visualization-only. It does not become a new registry.

## Implementation slices

### Slice A — Fleet cards and spatial topology

- convert current compute/runtime rows into one topology node model;
- render with `@xyflow/react`;
- preserve current Mission Control summary and queue panels;
- machine cards show current canonical metrics only;
- clicking a machine opens inspector;
- fit/zoom/filter/search.

### Slice B — machine explorer

- add `/mission-control/machines/[id]`;
- Overview + Resources + Containers;
- use existing Docker resource endpoint;
- add charts only for data that has a legitimate historical source.

### Slice C — live agents/processes

- reconcile PR #1543 resource model;
- show session/process CPU/RSS/PID;
- tie process to agent/runtime/task only when evidence exists;
- UNKNOWN instead of inference from catalog.

### Slice D — jobs/models/network/evidence

- job and claim detail;
- Ollama model inventory/residency;
- network reachability;
- evidence timeline.

### Slice E — AI sidecar

- contextual read-only explanation;
- natural-language fleet filters;
- source/evidence links;
- no mutation from free-form chat.

### Slice F — governed actions later

Only after read truth is proven:

- drain worker;
- resume worker;
- maintenance mode;
- restart a non-protected worker container.

All actions require typed policy, evidence and protected-surface controls.

## Acceptance

A reviewer should be able to perform this sequence:

1. Open `/mission-control`.
2. See all observed machines in one spatial view.
3. Distinguish control-plane, Mac/runtime and GPU workers immediately.
4. See ONLINE/BUSY/DEGRADED/OFFLINE/UNKNOWN without fabricated state.
5. Zoom/select `home-gpu-01`.
6. See CPU/RAM/GPU/VRAM/temperature/disk where runtime telemetry exists.
7. Open its container view.
8. See resource usage per observed container.
9. Open Agents & Processes.
10. See only truly running runtimes/processes as running.
11. Trace a live job from queue -> worker -> runtime -> evidence.
12. Zoom back out to the complete architecture.
13. Put the machine into gaming/drain state through canonical policy when that action lane exists and see the architecture update truthfully.

## Non-goals

- no second telemetry database in this lane;
- no synthetic green health;
- no direct production mutation;
- no Peskids mutation;
- no secret display;
- no new queue/registry/scheduler;
- no “AI magic” that hides missing evidence;
- no duplicate Mission Control application.

## Design statement

The operator experience should answer three questions in seconds:

1. **What exists?**
2. **What is happening right now?**
3. **Why is it happening, and what evidence proves it?**

The interface should make a complex multi-machine AI system feel legible without oversimplifying the truth.
