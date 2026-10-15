# Ops After Dark — Remote Stream Control

Status: canonical design for safe remote control while the operator is away.

## Goal

Allow the operator to control a limited set of stream actions from a phone without exposing arbitrary shell access to OBS or allowing an LLM to control OBS directly.

## Canonical path

```
Phone
  ↓
Tailscale/private network
  ↓
authenticated remote command
  ↓
allowlisted stream-control adapter
  ↓
OBS WebSocket
  ↓
approved scene/action only
```

This must JOIN_EXISTING with the current Ops After Dark / Mission Control workstream.

Do not create a second orchestrator, queue, scheduler, registry, or Mission Control.

## Allowed remote actions

Initial allowlist:

- `STARTING_SOON`
- `GAMING`
- `CODING`
- `FACTORY_FOCUS`
- `INTERMISSION`
- `STATUS`

Optional later:
- mute/unmute one approved audio source;
- show/hide one approved overlay;
- request current scene;
- request stream-safe Mission Control status.

## Forbidden remote actions

Never expose from the phone command surface:

- arbitrary shell;
- arbitrary OBS source mutation;
- arbitrary file read/write;
- Twitch stream key;
- OBS WebSocket password;
- secrets/tokens/cookies;
- production deploy;
- merge approval;
- Peskids production mutation;
- DNS/routing;
- secret rotation;
- arbitrary LLM-generated OBS commands.

## Scene mapping

Logical scenes:

- `STARTING_SOON` → existing starting/holding scene
- `GAMING` → current gaming scene
- `CODING` → coding/vibe-coding scene
- `FACTORY_FOCUS` → Mission Control / factory focus scene
- `INTERMISSION` → away/intermission scene

The adapter maps logical names to the operator's existing OBS scenes. It must not require destructive renaming.

## Operator command UX

Target command form:

```
oad scene gaming
oad scene coding
oad scene factory
oad scene intermission
oad status
```

These commands are presentation controls only.

They are not authorization for software-factory actions.

## Phone connectivity

Preferred path:
- phone connected to Tailscale;
- SSH only to the approved control host;
- attach to an existing `tmux` session when possible;
- avoid spawning duplicate OpenCode runtimes.

Example operator flow:

```
ssh opsly@smdqcia-pc.taile4fe40.ts.net
tmux new -A -s opsafterdark
cd /mnt/c/Users/opsly/opsly
oad status
oad scene factory
```

The hostname above is a logical/current node reference and must be validated at runtime before being relied on.

## OpenCode role

OpenCode may:
- validate GitHub state;
- inspect Mission Control;
- prepare safe stream events;
- run tests;
- update code through normal branches/PRs.

OpenCode must not:
- control OBS directly with arbitrary generated commands;
- bypass the allowlisted scene adapter;
- claim a scene changed without evidence.

## Audience holding mode

When operator is away, the stream may use:

`CAPTAIN OFF-DECK / AUTONOMOUS FACTORY ACTIVE`

Allowed content:
- Mission Control stream-safe status;
- read-only factory activity;
- recent events;
- QA/review states;
- safe lore/learning overlays.

If the factory needs a protected decision:
- show `NEEDS_HUMAN`;
- do not infer approval.

## Safety

All data visible to OBS/Twitch must pass through the canonical stream-safe projection.

See:
- `docs/streaming/STREAM-SAFE-POLICY.md`
- `docs/streaming/OBS-EVENT-AUTOMATION.md`

## Implementation order

1. Validate current OBS WebSocket availability and auth.
2. Validate current logical-to-physical scene mapping.
3. Implement one small allowlisted adapter/CLI.
4. Add status/readback before scene mutation.
5. Add tests for rejected arbitrary commands.
6. Add dry-run mode.
7. Prove scene switching locally while not live.
8. Only then allow remote use over Tailscale.

## Acceptance

A remote operator can:
- query current scene;
- switch among approved logical scenes;
- receive confirmation of the actual resulting scene;
- fail closed on unknown commands;
- avoid exposing secrets;
- leave the software factory unaffected if OBS is unavailable.
