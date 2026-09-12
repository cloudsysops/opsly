# Astral Arena — Steam release readiness

## Already implemented in Opsly

- Godot 4.7.2 product.
- Windows Desktop export preset.
- Web preview/staging lane.
- reusable `godot-steam` blueprint.
- content pack validation.
- Steam IDs intentionally external to source control.
- Windows package manifest + SHA-256 contract.
- SteamPipe VDF templates and renderer.
- Steam adapter boundary in Godot.
- store-asset manifest.
- human-approval release policy.

## Owner/operator inputs still required

- Steamworks partner onboarding.
- Steam Direct fee.
- legal/tax/bank verification.
- real AppID.
- Windows DepotID.
- Steam build account / Steam Guard process.
- final pricing and territories.
- store page legal text and disclosures.
- final release approval.

## Technical gates

### Gate A — Windows artifact

Expected:

```
dist/astral-arena/
├── AstralArena.exe
├── build-manifest.json
└── SHA256SUMS.txt
```

The build must launch without Godot Editor or repository files.

### Gate B — SteamPipe package

Environment-only IDs:

```
STEAM_APP_ID
STEAM_DEPOT_WINDOWS_ID
```

Generate:

```
node scripts/games/render-astral-steampipe.mjs
```

No upload occurs during generation.

### Gate C — private Steam installation

After Steam credentials exist:

1. upload a build with SteamCMD;
2. assign it to private `playtest`/internal branch;
3. install through the normal Steam client;
4. verify launch, save/load, controller, co-op local and 2D↔3D;
5. record the tested BuildID;
6. only then consider store/build review.

## Steam integration phases

### Phase 0 — now

Steam is distribution only.

### Phase 1

Bind real Steam runtime behind `SteamAdapter`:
- overlay/runtime detection;
- achievements;
- rich presence;
- stats.

### Phase 2

Optional:
- Steam Cloud;
- controller API;
- lobbies/online multiplayer;
- Steam Deck verification.

Game rules and save schema remain Steam-independent.
