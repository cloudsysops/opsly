# Astral Arena Legacy Reuse Matrix

Source reviewed: `cboteros/astral-arena` branch `feat/brissa-astral-guardian`.

Target: `cloudsysops/opsly` / `feat/astral-arena-universe`.

## Principle

Do **not** move the legacy repository into Opsly.

Reuse:
- proven gameplay concepts;
- data shapes that still make sense;
- UX patterns;
- event contracts;
- lore/assets that are original and canonical.

Do not reuse:
- duplicate infrastructure;
- old engine ownership;
- client-authoritative combat;
- placeholder security;
- trading/NFT monetization;
- trademarked transformation names;
- claims of production readiness that are not backed by current tests.

## Reuse matrix

| Legacy subsystem | Reuse? | Target owner | Migration |
|---|---|---|---|
| Guardian lore / Arena / Brissa / Dragons / Altair | YES | `@intcloudsysops/universe` | Already largely migrated; legacy docs remain reference only |
| `AdvancedMissions.tsx` | YES — model concepts | `@intcloudsysops/game-core` | Bring prerequisites, unlocks, objective types, rewards, difficulty, repeatability, conditions/effects, story arcs and world events into a v2 mission contract |
| Tamagotchi lifecycle | YES — strongly | `@intcloudsysops/game-core` Companion Forge | Reuse health/energy/happiness/XP/attributes, feed/play/train/care/evolution loops; rename and generalize |
| Tamagotchi ownership checks | YES | authoritative multiplayer/profile service | Preserve explicit ownership validation for companion actions |
| Legacy evolution names | NO | — | Remove Saiyan / Ultra Instinct / other third-party IP; replace with original Astral evolution tiers |
| BattlePage / BattleScreen | YES — UX only | Godot presenters / future mobile renderer | Reuse health bars, action buttons, cooldown feedback, battle log, hit/defend animation ideas, haptics |
| Legacy battle math | NO | `@intcloudsysops/game-core` | Client-side random damage and local authority are replaced by deterministic/server-authoritative rules |
| `astralStore.ts` | PARTIAL | game-core save/profile contracts | Reuse concepts: active companion, selected abilities/cards, battle history, room state; do not reuse token/NFT wallet state |
| Socket.IO `SocketService` | YES — protocol patterns | multiplayer service adapter | Reuse authenticated sockets, presence, rooms, challenge/accept, leave/join, chat, Redis fanout |
| Legacy room authorization | PARTIAL | multiplayer service | Keep participant checks; remove default-allow behavior |
| Legacy multiplayer battle execution | NO | authoritative match runtime | Old sockets connect/challenge players but do not provide authoritative battle simulation |
| Arena tech cards/decks | YES | Cyber Arena / Battle Core | Reuse decks, card catalog shape, cast commands, rate limiting; convert into original tech/defense abilities |
| Arena tech PvE match endpoints | YES — lifecycle | match service | Reuse start/resolve concept, but match state/result must be authoritative and idempotent |
| Leaderboard | YES — concept | Astral Elo / profile service | Replace generic score leaderboard with ranked/non-ranked ladders and seasons |
| Clan model | PARTIAL | future Guilds / Constellations | Existing model is too thin; reuse only the social-group concept |
| React Three Fiber 3D world | REFERENCE ONLY | Godot | Use layouts/effects/interaction ideas; do not maintain a second 3D engine |
| Browser `GameEngine.ts` | REFERENCE ONLY | Godot blueprint | Input/game-loop ideas already superseded by Godot; may inform lightweight browser mini-games later |
| React Native battle UI | YES — future client UX | future mobile/client adapter | Haptics and compact action layout are useful |
| Trading / real-capital systems | NO | — | Outside current family game product |
| NFT/Web3 wallet state | NO for v1 | — | Do not couple core progression or collectibles to blockchain |
| Old marketing playable demo | NO | Content OS | Replace with actual Godot Web preview and gameplay-derived content |
| Old automation scripts | SELECTIVE | Opsly agents/CI | Only migrate a script if current Opsly lacks the capability and it passes current governance |

## High-value legacy ideas to migrate now

### 1. Companion Forge

Legacy Tamagotchi already had the right primitive loop:

`create → care → play → train → gain XP → evolve → battle`

Generalize it to companion families:

- real-world-inspired pets;
- futurist AI companions;
- prehistoric creatures;
- Astral Dragons;
- fantasy creatures;
- myth/legend-inspired creatures;
- celestial archetypes.

The player can choose a companion and customize visual traits while species/family rules remain data-driven.

### 2. Mission Contract v2

Legacy Advanced Missions contains useful concepts that the current first-playable mission schema does not yet model:

- prerequisites;
- unlock graph;
- optional/hidden objectives;
- difficulty;
- repeatable/cooldown;
- world event participation;
- conditions;
- effects;
- story arcs/chapters.

Migrate these into reusable Game Core contracts, not React components.

### 3. Multiplayer Protocol

Legacy Socket.IO already defines useful event semantics:

- authenticated connect;
- presence;
- join/leave room;
- battle challenge;
- challenge accepted;
- chat;
- achievements/notifications through Redis.

Keep the protocol concepts but add:

- authoritative match state;
- server-validated actions;
- idempotent command ids;
- reconnect/resume;
- deterministic battle seed;
- anti-replay;
- explicit room ACL default-deny;
- ranked vs unranked distinction;
- Astral Elo update only after authoritative completion.

### 4. Battle Presentation

Legacy web + mobile proves we already explored:

- 3D combat;
- health/energy display;
- attack/defend/special actions;
- cooldown UX;
- battle log;
- mobile haptics.

The new Opsly runtime should keep those interaction ideas while rendering through Godot 2D/3D/hybrid presenters sharing one state.

### 5. Tech Cards

Legacy cards such as infrastructure/defense concepts are a good fit for the new educational layer.

Transform the system into:

- Architecture Cards;
- Cyber Defense Cards;
- Companion Abilities;
- Astral Techniques.

Decks can be used in:
- Cyber Arena;
- PvE;
- PvP unranked;
- ranked Astral Arena after balance validation.

## Legacy systems explicitly retired

The following do not become dependencies of the new game:

- Python Flask Astral Arena API;
- duplicate Node/React stacks;
- direct Mongo/Postgres/Redis ownership from the game client;
- real-money trading;
- NFTs as required progression;
- old Saiyan-branded evolution tree;
- old React Three Fiber world as primary engine;
- legacy marketing claims.

## Target architecture

```
Legacy repo
   │
   ├── lore/data concepts ───────────────► Opsly Universe
   ├── mission model concepts ───────────► Game Core
   ├── Tamagotchi concepts ──────────────► Companion Forge
   ├── battle UX concepts ───────────────► Godot 2D/3D presenters
   ├── Socket event concepts ────────────► Multiplayer adapter
   └── tech-card concepts ───────────────► Cyber Arena / Battle Core

No legacy service becomes authoritative.
```

## Migration order

1. Companion Forge contract.
2. Multiplayer event protocol + authoritative match state.
3. Astral Elo.
4. Mission Contract v2.
5. Tech-card/deck adapter.
6. Guild/Constellation social layer.
7. Mobile-specific UX later.


## Migration progress — 2026-09-12

Already materialized in the new Opsly game line:

- **Battle presentation** → Godot 2D/3D/hybrid presenters with shared state;
- **Companion concept** → seven reusable companion families in Game Core/content pack;
- **Family gameplay** → single-player + local Sisters co-op;
- **Web product** → real Godot Web export/staging instead of legacy marketing demo;
- **Windows product** → real Godot Windows artifact pipeline;
- **Steam boundary** → distribution adapter and SteamPipe preparation without legacy services.

Still planned/not complete:

- authoritative online multiplayer protocol;
- Astral Elo;
- Mission Contract v2;
- tech-card adapter;
- Guild/Constellation social layer.

The legacy repository remains reference material only; no legacy server has become
authoritative in the current product.
