# @intcloudsysops/pattern-catalog

Loads and applies reusable patterns from `config/patterns/` for Sigma harness decisions, tenant capability profiles, and Opsly module scaffolds.

## Layout

| Kind | Path | Use |
|------|------|-----|
| harness | `config/patterns/harness/*.json` | Reviewer roles, quorum overrides, Sigma search hints |
| tenant | `config/patterns/tenant/*.json` | Capabilities, modules, scripts, harness pattern links |
| opsly | `config/patterns/opsly/*.json` | lib paths, MCP registration, env templates |

Index and integration map: `config/patterns/index.json`.

## API

```typescript
import {
  listPatterns,
  getHarnessPattern,
  applyHarnessPattern,
  enrichTenantProfile,
  resolveTenantCapabilities,
  validatePatternIndex,
} from '@intcloudsysops/pattern-catalog';
```

- **Harness:** `applyHarnessPattern({ patternId, topic, summary, repoRoot? })` → topic prefix, reviewers, Sigma search text, quorum overrides.
- **Tenant:** `enrichTenantProfile({ tenant_slug, pattern_ids, ... })` → merged `capabilities`, `modules`, `harness_patterns`.
- **Validate:** `validatePatternIndex()` → list of missing or invalid pattern files.

## CLI

```bash
npm run patterns:validate    # index + file checks
npm run patterns:list        # table of all patterns
npm run patterns:install     # validate + optional sigma:install
./scripts/apply-tenant-pattern.sh --slug peskids
```

## MCP (apps/mcp)

- `patterns:list` — filter by kind
- `patterns:get` — full pattern JSON by id
- `patterns:validate` — run validatePatternIndex
- `patterns:enrich_tenant` — merge tenant config with patterns

## Sigma harness

`lib/sigma-harness` calls `applyHarnessPattern` when `DecisionProposal.patternId` or MCP `sigma:start_decision` `pattern_id` is set.

## Tests

```bash
npm run test --workspace=@intcloudsysops/pattern-catalog
```
