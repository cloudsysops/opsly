# Factory Milestone 1 — Parallel Control Plane

Status: PREPARED pending physical evidence.

## Purpose

This milestone certifies that Opsly has one canonical control plane capable of planning, owning, routing, reconciling, observing and safely deferring parallel Software Factory work without introducing duplicate queues, schedulers, registries, reviewers or cockpits.

## Software gates

Milestone software is PREPARED when all of the following are landed on exact-head governed gates:

1. security baseline/delta policy (#1685);
2. zero-cost autonomous routing through local OpenCode + Ollama/Qwen (#1686);
3. permanent four-lane supervisor + shared-gate deduplication (#1687);
4. deterministic PR reconciliation/PR Doctor integration;
5. WIP=1 ownership through conflict_key / DispatchClaimV1;
6. shared reviewer failure blocks merge readiness only, while independent runtime/CI/QA work continues;
7. Software Factory Telemetry exposes parallel-lane and shared-gate pressure;
8. no auto-merge, production deploy or protected-surface mutation is introduced.

## Physical gates

Milestone is PHYSICALLY_VERIFIED only after both gates below have fresh runtime evidence:

### Machine ownership — #1616

Evidence must prove against the canonical control Redis:

- acquire;
- competing holder refused;
- owner renewal;
- non-owner renew/release refused;
- owner release or safe expiry;
- governed PC Gamer session holds the claim for its lifetime;
- claim loss fails closed.

### Gamer acceptance — workpack #050

Evidence must prove:

- machine claim held for the acceptance run;
- PC Gamer selected;
- OpenCode bridge healthy;
- existing local Qwen model used via Ollama;
- exact marker `GAMER_OPENCODE_OK`;
- `cost_usd=0`;
- no Mac/cloud fallback;
- terminal success;
- zero leftover `opsly-task-*` sessions;
- machine claim released after teardown.

## Milestone states

- `PREPARED`: software contracts/tests/policy are complete; no claim of physical runtime capability.
- `PHYSICALLY_VERIFIED`: #1616 + #050 fresh evidence exists.
- `FACTORY_OPERATIONAL`: broader #1588 acceptance passes happy path + failover + protection + no-progress + offline recovery.

This milestone does not weaken #1588. It creates a clean intermediate checkpoint between architecture completeness and full autonomous-factory certification.
