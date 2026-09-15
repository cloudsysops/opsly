# Mission Control OpenClaw cockpit

This entry records the visual direction implemented in the live Opsly admin Mission Control.

## Live implementation

- Route: `/mission-control`
- Component: `apps/admin/components/MissionControlCockpit.tsx`
- Existing detail panels reused:
  - `ComputeWorkersPanel`
  - `LocalNodesPanel`

## Data sources

The cockpit consumes existing APIs:
- `/api/admin/mission-control/orchestrator`
- `/api/admin/mission-control/openclaw`
- `/api/admin/mission-control/teams`
- `/api/runtime/nodes/status`
- `/api/admin/compute-workers`

No synthetic metric is required for the primary dashboard. Services not backed by live telemetry are labelled `planned`.

## Image retention

The generated PNG is the canonical visual reference for this entry. The prompt and metadata are versioned here so the image can be reproduced and audited with the implementation history.
