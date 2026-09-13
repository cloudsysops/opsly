---
status: canon
owner: product
last_review: 2026-09-12
---

# Opsly Creator OS — Product Thesis

## Canonical hierarchy

**Creator OS is the product.**

- **Command Deck** — live creator control surface on second monitor/tablet/phone.
- **Stream Overlay** — viewer-facing surface.
- **Opsly Moments** — durable cross-game memory/content layer.
- **Editor** — post-stream timeline, selection, packaging and publish handoff.
- **Opsly Arena** — future native/full-power demonstration of Creator OS.
- **Astral Games Lab** — separate game R&D/incubation lane.
- **Astral Arena** — separate game product / Steam lane.
- **Content OS** — downstream content transformation/review/publishing where applicable.

Canonical GitHub map: #1352  
Creator OS epic: #1341

## Product loop

```text
PLAY -> OPERATE -> PARTICIPATE -> REMEMBER -> PUBLISH
```

## Four views

| View | User | Purpose |
|---|---|---|
| Game Screen | Player | Play |
| Command Deck | Creator | Operate |
| Stream Overlay | Viewer | Watch + participate |
| Editor | Creator/editor | Remember + package + publish |

## Architecture

```text
GAME / HARDWARE / OBS / CHAT / AUDIENCE
                  |
               ADAPTERS
                  |
          NORMALIZED EVENT BUS
                  |
     +------------+-------------+
     |            |             |
 Command Deck   Overlay      Moments
                               |
                         Moment Detector
                               |
                             Editor
```

The Event Bus is canonical. Consumers must not depend directly on vendor payloads.

## Adapter Contract

Every external game/platform adapter declares capabilities explicitly. Creator OS must degrade gracefully when a game exposes no official telemetry.

Generic mode still supports:
- hardware telemetry;
- OBS;
- chat/community;
- manual challenges;
- manual Moments;
- Card Studio;
- Editor.

## OPSLY FAIR-PLAY CERTIFIED

Fair Play is a visible product trust signal.

Allowed sources:
- user-owned hardware telemetry;
- OBS/stream events;
- official publisher APIs;
- explicit player input;
- authorized first-party game telemetry.

Forbidden:
- protected-game memory scraping;
- injection;
- anti-cheat bypass;
- hidden opponent information;
- unauthorized packet/process manipulation.

Fair-Play provenance must be machine-readable and visible on eligible modules/Moments/cards.

## Moment Engine

A raw event is not automatically a Moment.

Initial scoring hypothesis:

```text
MomentScore =
  event_rarity                * 0.30
+ community_participation     * 0.20
+ outcome_unexpectedness      * 0.20
+ player_performance          * 0.15
+ narrative_coherence         * 0.15
```

Initial bands:
- < 0.40 -> ignore
- 0.40–0.59 -> Common/Rare candidate
- 0.60–0.79 -> Epic candidate
- 0.80–0.94 -> Legendary candidate
- >= 0.95 -> Mythic candidate; human confirmation required

Creator always retains KEEP / DOWNGRADE / REJECT control. No auto-publish by default.

## Official MVP modules

1. System
2. Chat
3. OBS Control
4. Challenges
5. Community
6. Session Stats
7. Moment Detector
8. Card Studio

Use **module**, not widget, in Creator OS product language.

## Security invariants

### Local Bridge
- localhost only;
- session-scoped token;
- rotate token per stream/session;
- explicit capability grants;
- outbound-only by default;
- no arbitrary remote code execution.

### Command Deck resilience
- sequence-numbered events;
- last-known state;
- reconnect/replay window;
- degraded mode;
- no invented events while disconnected.

### OBS
Permission scopes:
- OBS_READ
- OBS_CONTROL
- OBS_ADMIN

High-impact/destructive actions require explicit confirmation.

## MVP thesis

Do **not** build Opsly Arena first.

First prove:
- EventEnvelope/Event Bus;
- Local Bridge;
- Command Deck;
- OBS/System/Community;
- Moment Detector;
- Card Studio;
- basic Editor;
- 3-stream real creator validation.

## Validation hypotheses

- H1: creator uses Command Deck for 3 consecutive streams.
- H2: viewers repeatedly participate.
- H3: generated Moments are kept/shared/published.
- H4: Command Deck reduces tool/window switching.
- H5: Moment candidate quality is high enough to avoid spam.

North-star: **Creator Sessions Powered by Opsly**.

## Flywheel

```text
better modules
 -> more creators
 -> more streams
 -> more audience interaction
 -> more event data
 -> better Moments
 -> more publishable content
 -> more distribution
 -> more viewers + creators
 -> publisher interest
 -> official adapters
 -> richer modules
```

## Relationship to existing Opsly

Reuse:
- Content OS / Creator Studio;
- canonical agent runtime/workpacks;
- existing approval/governance primitives;
- Game Product Blueprint only for actual games.

Do not create:
- second publisher;
- second agent orchestrator;
- second game canon authority;
- duplicate Creator OS Event Bus;
- duplicate approval lifecycle without proof it is necessary.

> Command Deck does not exist to support Opsly Arena.
>
> Opsly Arena exists to demonstrate the full potential of Creator OS.
