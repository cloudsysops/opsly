# Astral Arena — Transmedia Franchise Architecture

## Decision

Astral Arena is not only a game and it is not only a content channel.

It is a **franchise graph** where one canonical story event can become:

- a playable mission;
- a story episode;
- a YouTube long-form piece;
- a Short/Reel/TikTok clip;
- a trailer beat;
- Steam store media;
- lore/reference material.

There is still only one canon owner.

```
                @intcloudsysops/universe
                         │
                    CANON EVENTS
                         │
          ┌──────────────┴──────────────┐
          │                             │
 @intcloudsysops/game-core    @intcloudsysops/content-studio
          │                             │
     mission/rules                 transmedia binding
          │                             │
          └──────────────┬──────────────┘
                         │
                  Game Content Pack
                         │
                       Godot
                         │
                 real gameplay events
                         │
                  Content OS v2
                         │
        ingest → highlights → render → QA
                         │
                      Moon
                  human approval
                         │
      ┌──────────┬───────┼─────────┬─────────┐
      ▼          ▼       ▼         ▼         ▼
   Episode     Shorts  Trailer   Steam     Social
```

## Ownership

### Universe

Owns:
- canonical characters;
- worlds;
- relationships;
- story events;
- values;
- continuity.

### Game Core

Owns:
- missions;
- battle rules;
- progression;
- companion rules;
- deterministic systems.

### Godot

Owns:
- player experience;
- rendering;
- input;
- local presentation;
- capture events.

### Content Studio

Owns:
- transformation of owned gameplay/story material into media;
- episode/storyboard production;
- highlight selection;
- rendering;
- rights/QA;
- independent review;
- distribution packages.

Content Studio does **not** rewrite canon.

### Moon Creator Studio

Owns the human gate:
- approve;
- reject;
- schedule;
- choose surfaces/platforms.

## Transmedia binding

Every franchise-aware `ContentProjectEnvelope` may carry:

- franchise;
- season;
- chapter;
- story event;
- mission IDs;
- episode ID;
- character IDs;
- companion IDs;
- world IDs;
- gameplay build SHA;
- capture markers;
- target surfaces;
- continuity classification.

This is the join key between story and actual production.

## Season 1

Machine-readable map:

`config/games/astral-arena-transmedia.json`

Season 1 contains four chapters and all sixteen canonical missions.

The first chapter is the current vertical slice:

`Awakening → Orion → Aurora → NX-7`

Each is mapped to a planned/implemented episode ID and capture markers.

## Bigger product loop

```
WRITE CANON
   ↓
BUILD MISSION
   ↓
PLAY
   ↓
CAPTURE
   ↓
CREATE CONTENT
   ↓
HUMAN APPROVE
   ↓
DISTRIBUTE
   ↓
REAL PLATFORM METRICS
   ↓
LEARN WHAT CONNECTS
   ↓
improve presentation / marketing / pacing
   └───────────────┐
                   │
          NEVER rewrite canon
          automatically
```

Metrics can influence:
- trailer hooks;
- episode pacing;
- thumbnail style;
- onboarding clarity;
- which companions audiences want to see more.

Metrics must not automatically decide:
- canon truth;
- children's traits;
- morality;
- story outcome;
- ranked gameplay balance.

## Product opportunities

The same franchise can support:

1. premium Steam game;
2. free Web demo;
3. YouTube/short-form story channel;
4. episodic lore;
5. educational Technolia/Cyber Arena content;
6. physical collectibles;
7. future books/comics;
8. safe community events;
9. DLC/expansions;
10. future games using the same Opsly game/franchise blueprint.

## Rule for future games

The reusable component is not Astral lore.

The reusable component is:

`canon event → game event → content project → review → distribution`

A second game should be able to use this pipeline with a different universe.


## Prelaunch growth loop

Campaign:
`data/content/campaigns/astral-arena-prelaunch-45-days/campaign.json`

Product growth gates:
`config/games/astral-arena-launch-loop.json`

The campaign is deliberately **not** an automatic publishing schedule. Dates are
editorial planning slots. Moon approval is still required.

Before Steam Coming Soon exists:
- CTA = follow development / play preview.

After Steam Coming Soon is verified live:
- CTA may switch to wishlist.

This prevents content from advertising a Steam destination that does not exist yet.
