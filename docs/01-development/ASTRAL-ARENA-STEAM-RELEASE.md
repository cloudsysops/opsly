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

### Gate A — Windows artifact ✅ first CI artifact produced

Expected:

```
dist/astral-arena/
├── AstralArena.exe
├── build-manifest.json
└── SHA256SUMS.txt
```

The first CI artifact was produced successfully:

- run `34725562503`;
- source SHA `10cc0c54c81752f150208f7c6c77fe998f2ec978`;
- artifact `astral-arena-windows-10cc0c54c81752f150208f7c6c77fe998f2ec978`;
- artifact digest `sha256:4146a33a8b7b0e6d27ed49d651b83fb6e7869e6d37134e2884b23bc59603c63d`.

CI export is proven. The remaining Gate A runtime check is to launch the artifact
outside Godot Editor on a Windows machine and complete a smoke playtest.

### Gate B — SteamPipe package 🟡 implementation ready, real IDs pending

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

### Gate C — private Steam installation 🔒 blocked on Steamworks onboarding

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


## Store claim policy

Do not mark Steam store features merely because architecture exists.

Publish only after verification:
- Online Co-op;
- Online PvP;
- Steam Achievements;
- Steam Cloud;
- Steam Deck support/verification.

Safe current claims after gameplay QA may include:
- single-player;
- local co-op;
- family-friendly;
- 2D/3D hybrid presentation;
- turn-based/ability-driven combat.

Final store wording still requires human approval and must match the reviewed build.

## Release environments

Recommended GitHub protection:

- `staging`: browser preview only;
- `steam-playtest`: private SteamPipe upload, explicit approval;
- `steam-release`: public promotion, explicit approval and release checklist.

Do not reuse the normal staging deploy credentials for Steam.
