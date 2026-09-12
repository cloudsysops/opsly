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
