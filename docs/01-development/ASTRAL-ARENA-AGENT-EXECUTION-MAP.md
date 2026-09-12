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
#1311 Windows x64 build
               │
               ▼
#1302 SteamPipe private build

#1313 Content capture can run in parallel after gameplay events exist.
#1314 Blueprint graduation runs independently and must not import Astral canon.
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

## Workpack C — PC Gamer Windows build

Issue: #1311

Deliver:
- Godot 4.7.2 cache/install on authorized runner;
- export templates;
- headless import;
- Windows x64 export;
- GitHub artifact;
- manifest + SHA-256.

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
