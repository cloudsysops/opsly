# {{GAME_TITLE}}

Generated from Opsly **godot-steam** game-product blueprint.

## Ownership boundaries

- Godot owns rendering, input, scene lifecycle and local presentation.
- `@intcloudsysops/universe` owns canon.
- `@intcloudsysops/game-core` owns reusable rules and game-product contracts.
- Generated content packs bridge Opsly into the Godot client.
- Steam is an adapter; Steam IDs and credentials are not committed.

## Do not copy between games

Do not copy:
- characters,
- worlds,
- Steam AppIDs,
- save files,
- branded art,
- secrets.

Reuse:
- controller/input layer,
- save/load adapter,
- settings,
- accessibility,
- content-pack loader,
- mission interpreter,
- inventory,
- capture hooks,
- Steam adapter,
- telemetry adapter.


## Reusable presentation modes

The blueprint supports three presentation modes:

- `2D` — top-down/tactical/lightweight presentation.
- `3D` — immersive world and cinematic presentation.
- `HYBRID` — one gameplay state rendered by both.

`src/runtime/presentation_router.gd` is the reusable boundary. It owns **no canon** and
does not calculate battle results. It keeps the shared runtime state alive while
renderers are swapped.

Expected renderer contract:

```gdscript
func render_state(state: Dictionary) -> void:
    # draw only — never mutate canonical gameplay state here
    pass
```

A mode change must preserve at minimum:

- turn/round;
- health;
- energy;
- effects;
- inventory;
- mission context.

The next game can replace every visual asset and still reuse this contract.
