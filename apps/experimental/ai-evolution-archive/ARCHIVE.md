# ai-evolution Archive

Archived on 2026-04-24 per ADR-031.

## Why archived

- Experimental module with no active scope in current roadmap.
- Not part of production runtime path.

## How to revive

1. Move back to top-level `apps/` (or define new stable location).
2. Re-enable workspace references and CI jobs.
3. Run `npm run type-check` and `npm run build`.
4. Open ADR/update describing the reactivation use case.
