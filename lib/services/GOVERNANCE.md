---
title: "lib/services Governance"
description: "Module governance for data access layer"
---
# lib/services Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Backend Engineering Team
- **Escalation:** Database Lead

## Repository Standards

All repositories must:

1. **Extend BaseRepository** — Use base class for consistency
2. **Enforce Tenant Scoping** — Always pass tenantId parameter
3. **Be Type-Safe** — Full TypeScript, no `any`
4. **Include Tests** — Unit + integration tests
5. **Document Query Logic** — Comments for complex queries

## Multi-Tenant Safety Rules

- ✅ All queries must include `tenantId` filter
- ✅ Never assume tenantId from context without validation
- ✅ Test cross-tenant isolation in unit tests
- ❌ Never allow queries without tenant filter
- ❌ Never leak data from find() across tenants

## Review Process

1. **Scope:** New repositories, service interfaces, query logic
2. **Approvers:** 1 (Backend Maintainer)
3. **Checks:**
   - ✅ Repository extends BaseRepository
   - ✅ All queries include tenantId filter
   - ✅ Cross-tenant tests included
   - ✅ Type-safe (no `any` types)
   - ✅ Backward compatible

## Caching Strategy

Repositories support optional caching:

```typescript
interface CacheOptions {
  ttl: number;      // Cache duration (seconds)
  key: string;      // Cache key pattern
  invalidateOn?: string[]; // Events that clear cache
}

class AgentRepository extends BaseRepository<Agent> {
  async find(id: string, tenantId: string, cacheOpts?: CacheOptions) {
    // Implementation checks cache first, then DB
  }
}
```

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New repositories: MINOR bump
- Breaking interface changes: MAJOR bump

## Dependencies

### This Module Depends On

- `@intcloudsysops/errors` — For error handling

### Modules That Depend On This

- All service layers in `apps/*`
- `@intcloudsysops/api` — For data fetching
- `@intcloudsysops/workflow` — For agent data access

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Repository examples, testing patterns

---

## Enlaces relacionados

- [[lib/services/README|services]]
- [[README|Inicio]]
