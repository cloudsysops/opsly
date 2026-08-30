# DECISIONS

## 2026-08-16 — Preserve foundation as machine-readable canon

Decision: create `config/universe/foundation.json` plus runtime getters in `@intcloudsysops/universe`.

Reason: future agents need one stable source for origin, vision, safety, and non-negotiables.

Alternatives considered:

- prose-only documentation
- duplicating canon in each consumer

Status: accepted

## 2026-08-16 — Explicit guard for unsafe universe changes

Decision: add a small policy check for obvious child-safety and canon-duplication violations.

Reason: future automation needs a direct machine-readable signal before a human review step.

Status: accepted
