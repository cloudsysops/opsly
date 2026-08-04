---
module: orchestrator-error-classifier
version: 1.0.0
owner: operations
status: active
---

# Governance — `@intcloudsysops/orchestrator-error-classifier`

## Overview

Error classification and repair strategy determination for orchestrator agents. Provides deterministic categorization of worker failures and recovery recommendations.

## Ownership & Reviews

- **Owner**: operations team
- **Review required**: Yes (security + architecture)
- **Review rotation**: Every 2 sprints or when adding categories

## Versioning

### Current: `1.0.0`

**Semver rules:**
- **MAJOR** bump (→ 2.0.0) if: error categories change, repair strategies refactor, API breaking
- **MINOR** bump (→ 1.1.0) if: new classification rules, new error categories (backward compatible)
- **PATCH** bump (→ 1.0.1) if: bug fixes, rule improvements, documentation

### Migration Path

When breaking changes occur:
1. Add new version alongside old in `lib/orchestrator-error-classifier@2/`
2. Update orchestrator imports in phases
3. Deprecate old version with notice in README
4. Timeline: 2 sprints minimum for consumers to migrate

## Scope & Constraints

### In Scope
- Deterministic error classification via pattern matching
- Repair strategy determination (operator_review, auto_retry, fail_fast, exponential_backoff)
- Classification rule management (add, remove, override)
- Observability (stats, metadata collection)

### Out of Scope
- Queue management (belongs in orchestrator)
- Worker retry logic (belongs in BullMQ configuration)
- Actual repair execution (belongs in RepairWorker)
- Multi-tenant isolation (handled by caller)

## Adding a New Error Category

Process:
1. **Proposal**: Comment in issue/PR with category name, examples, expected strategy
2. **Rule**: Add to `src/rules/default-rules.ts` with test coverage
3. **Test**: Add 2+ test cases in `__tests__/classifier.test.ts`
4. **Docs**: Update this governance file + README.md
5. **Review**: Requires approval from operations team

Example:

```typescript
// New category proposal
{
  id: 'new-category-name',
  name: 'New Error Type',
  pattern: /regex|pattern/i,
  category: 'new_category' as const,
  strategy: 'auto_retry',
  priority: 'high',
  isRecoverable: true,
  suggestedAction: 'Recovery suggestion',
  tags: ['tag1', 'tag2'],
}
```

## Custom Rules Policy

Third parties (workers, integrations) can register custom rules via `classifier.addRule()`:

**Allowed:**
- Pattern overrides for known error messages
- Provider-specific rules (N8N, Google Drive, etc.)
- Tenant-specific rules (via dynamic config)

**Prohibited:**
- Modifying built-in rule behavior (fork the classifier)
- Rules without clear owner/documentation
- Rules changing core recovery strategy for common errors

**Security review:**
- Pattern regex must not cause ReDoS (see test in `__tests__`)
- Rule tags must reference a team or component

## Testing Requirements

- **Unit tests**: 100% of public API + 80% of classification rules
- **Integration tests**: Repair queue integration (when implemented)
- **Performance tests**: Classification time < 1ms per error

Run tests:
```bash
npm run test --workspace=@intcloudsysops/orchestrator-error-classifier
npm run type-check --workspace=@intcloudsysops/orchestrator-error-classifier
```

## API Stability

### Stable (won't break in 1.x)
- `classifyError(error, context): ClassifiedError`
- `ErrorClassifier.classify(error, context): ClassifiedError`
- `ErrorClassifier.getRepairStrategy(classified)`
- `ClassifiedError` interface fields

### Experimental (may change)
- Internal rule matching algorithm
- Stats format (`getStats()`)
- Configuration defaults

## Metrics & Observability

**Telemetry points:**
- Classification success rate (% matched vs unknown)
- Average confidence score per category
- Most common errors (top 5 by frequency)
- Category distribution over time

**Alert thresholds:**
- > 20% unknown classifications → investigate new error types
- Confidence < 0.5 → check rule patterns
- No repairs in 24h → system health check

## Deprecation Policy

If a rule or category becomes obsolete:

1. **Sprint 1**: Mark with `@deprecated` comment, suggest migration
2. **Sprint 2-4**: Log warnings when triggered, document replacement
3. **Sprint 5+**: Remove with MAJOR version bump

Example:
```typescript
/**
 * @deprecated Use 'provider_error' instead
 * Deprecated in 1.2.0, will be removed in 2.0.0
 */
{
  id: 'old-rule',
  // ...
}
```

## Related Governance

- `lib/*/GOVERNANCE.md` — Other module governance
- `config/modules.json` — Module registry
- `docs/LIBRARY-MODULES.md` — Library integration guide
- ADR-XXX — Architecture decision if this becomes a system boundary

---

*Last reviewed: 2026-08-04*
