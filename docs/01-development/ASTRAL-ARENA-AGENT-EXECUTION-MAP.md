# Astral Arena — Agent Execution Map

Branch: `feat/astral-arena-universe`  
PR: #1300  
Product: **Astral Arena: Guardians of the Nexus**

This file is the execution map for parallel agents. GitHub issues are the source of task status.

## Dependency graph

```
#1309 Crystal Temple state/save
        │
        ├──────────────┐
        ▼              ▼
#1310 Technolia     #1312 End-to-end loop
        │              ▲
        └──────┬───────┘
               │
               ▼
#1311 Windows x64 artifact ✅ first artifact built
               │
               ▼
#1302 SteamPipe package ⏳ blocked only on real Steam IDs/account for upload

#1313 Content capture can run in parallel after gameplay events exist.
#1314 Blueprint graduation runs independently and must not import Astral canon.
#1316 Web preview ✅ staging pipeline has completed successfully.
```

## Workpack A — Crystal Temple runtime

Issue: #1309

Owner boundary:
- Godot gameplay state only.
- Universe/Game Core remain canonical.

Deliver:
- ordered mission progression;
- versioned local save;
- checkpoint restore;
- corrupt-save recovery.

Do not:
- add online dependency;
- store private child data;
- move canon into Godot.

## Workpack B — Technolia Spark Era

Issue: #1310

Deliver:
- first RTS construction scene;
- resources;
- building placement;
- Nexus Core / Portal Gateway / Memory Vault;
- Structured Requests research;
- persistent state.

Reusable code must avoid Astral-specific names where possible.

## Workpack C — Windows build / PC Gamer validation

Issue: #1311

Delivered in CI:
- Godot 4.7.2 verified editor/templates;
- headless import;
- Windows x64 export;
- GitHub artifact;
- manifest + SHA-256.

First successful artifact:
- run `34725562503`;
- artifact `astral-arena-windows-10cc0c54c81752f150208f7c6c77fe998f2ec978`;
- digest `sha256:4146a33a8b7b0e6d27ed49d651b83fb6e7869e6d37134e2884b23bc59603c63d`.

Remaining acceptance:
- install/launch outside Godot Editor;
- validate on Windows/PC gamer;
- later install through Steam private branch.

Never store Steam credentials in repository or executable.

## Workpack D — First complete gameplay loop

Issue: #1312

Depends on #1309 and minimal #1310.

Playable path:

`Crystal Temple → Technolia → Nexus Core → Cyber Arena bot swarm → reward → Technolia`

Cyber actions stay synthetic and isolated.

## Workpack E — Content OS bridge

Issue: #1313

Deliver:
- gameplay event manifest;
- capture markers;
- reviewable shorts/clips;
- canonical mission/character metadata.

No automatic publishing.

## Workpack F — Blueprint graduation

Issue: #1314

Deliver a CI-only second-game scaffold proving that `godot-steam` contains reusable infrastructure and no Astral Arena canon.

## Global acceptance gates

Every agent must preserve:

1. `@intcloudsysops/universe` owns canon.
2. `@intcloudsysops/game-core` owns reusable deterministic rules.
3. Godot owns rendering/input/local client behavior.
4. PC Gamer is replaceable compute, never authority.
5. Steam is a distribution adapter.
6. Content OS owns media-production workflow.
7. No production credentials in game source or artifacts.
8. Cyber Arena remains isolated/simulated.
9. Child characters remain age-appropriate and family-safe.
10. New reusable components need a smoke test before blueprint graduation.


## Workpack G — Browser preview

Issue: #1316

Primary future host: `https://astral-arena.op-sly.com`

Current working staging path:
`https://peskids-staging.op-sly.com/astral-arena/`

Deliver:
- Godot Web export;
- immutable static image;
- Traefik route + TLS;
- browser smoke test.

The current Web preset is single-threaded to maximize compatibility.
Steam remains the commercial desktop target.


## Workpack H — Family quick play / Hybrid Battle

Status: implemented in PR #1300.

Playable path:

`JUGAR AHORA → single-player or Sisters Co-op → guardian/companion/aura → Hybrid Battle`

The same battle state can be presented as 2D or 3D at runtime. Presenters must not
own battle truth.

## Workpack I — Companion Forge foundation

Current implementation includes seven data-driven companion families. Legacy
Tamagotchi concepts are being reused only as domain ideas; the old service is not a
runtime dependency.

## Workpack J — Steam release lane

Issues: #1302, #1303, #1311

Implemented:
- Windows artifact workflow;
- SteamPipe VDF templates;
- SteamPipe renderer;
- SteamAdapter;
- store asset manifest;
- fail-closed IDs/secrets policy.

Blocked externally on Steamworks onboarding and real AppID/DepotID for actual upload.
