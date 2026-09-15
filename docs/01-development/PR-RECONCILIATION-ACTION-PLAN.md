# PR Reconciliation Action Plan v1

This layer consumes the canonical #1497 reconciliation inventory and maps each lane to a next action.

It is deliberately **not another merge executor**.

- `MERGE_READY` → queue for the existing governed merge path.
- `BEHIND` → branch-update candidate after fresh head/base verification.
- `CHECK_FAILED` → Safe Repair lane.
- `CONFLICTED` → owned rebase/conflict-resolution lane.
- `SUPERSEDED` → cleanup candidate.
- protected work → Sierra escalation.

The plan preserves the invariant that every mutating action revalidates fresh evidence at the canonical execution boundary.
