# ADR-032: Reorganize Scripts by Category

**Status:** APPROVED (2026-04-24)  
**Decision:** Categorize operational scripts under thematic subdirectories while preserving compatibility wrappers for legacy paths.

## Context

- `scripts/` had a very large flat list of utilities and runbooks.
- Discoverability was poor and ownership unclear.
- Existing CI/runbooks referenced legacy script paths.

## Decision

### New Structure

```text
scripts/
├── infra/
├── deploy/
├── tenant/
├── ops/
├── utils/
└── ci/
```

### Phase 1 implementation

1. Move key scripts into the six categories using `git mv`.
2. Keep backward compatibility by creating wrapper scripts at old paths.
3. Add `scripts/README.md` as the central operator guide.
4. Update package scripts and key docs to reference canonical new paths.

## Consequences

✅ Faster script discovery  
✅ Cleaner boundaries by operational domain  
✅ No hard break for existing automations due to wrappers  
⚠️ Temporary duplication in path surface until wrappers are retired

## Migration Path

```bash
mkdir -p scripts/{infra,deploy,tenant,ops,utils,ci}
# move canonical scripts with git mv
# keep old path wrappers until deprecation window closes
```

## Decommission Plan

- Wrapper scripts remain until 2026-05-31.
- After that date, remove wrappers once CI and runbooks no longer reference them.
