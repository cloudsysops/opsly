---
title: "lib/migrations Governance"
description: "Module governance for database migrations"
---
# lib/migrations Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Database & Infrastructure Team
- **Escalation:** Database Lead

## Migration Standards

All migrations must:

1. **Be Reversible** — Both `up()` and `down()` implemented
2. **Be Idempotent** — Safe to run multiple times
3. **Be Testable** — Tested in staging before production
4. **Be Documented** — Clear name and comments
5. **Be Safe** — No data loss without explicit intent

## Migration Naming Convention

Versions use dates or sequential:

```
001_create_agents_table.ts
002_add_tenant_isolation.ts
2024_05_09_001_backfill_agent_status.ts
```

## Migration Review Checklist

Before merging migration PR:

- ✅ Both `up()` and `down()` implemented
- ✅ No breaking changes without MAJOR version bump
- ✅ Data backfill tested with production-like data
- ✅ Indexes added for new foreign keys
- ✅ Tested rollback in staging
- ✅ Estimated duration < 30 minutes

## Production Migration Rules

1. **Plan** — Schedule migration window
2. **Backup** — Full backup before migration
3. **Test** — Run on staging replica
4. **Monitor** — Watch for locks and slow queries
5. **Rollback Plan** — Have `down()` ready
6. **Communicate** — Notify affected teams

## Data Transformation Strategy

For large table changes:

```
1. Add new column (nullable)
2. Backfill data in batches (100K rows at a time)
3. Remove old column (separate migration)
4. Change application code to use new column
5. Monitor for issues (24 hours)
6. Remove cleanup code
```

Never migrate 1M+ rows in a single transaction.

## Versioning

- Sequential (001, 002, 003)
- OR date-based (2024-05-09)
- Never skip versions
- Never reuse versions

## Review Process

1. **Scope:** Any database schema change
2. **Approvers:** 1 (Database Maintainer)
3. **Checks:**
   - ✅ Migration is reversible
   - ✅ No data loss
   - ✅ Indexes on foreign keys
   - ✅ Estimated duration < 30min
   - ✅ Tested rollback

## Multi-Tenant Migrations

For multi-tenant systems:

```typescript
async function runMigrationPerTenant(migration, db) {
  const tenants = await db.from('tenants').select('id');

  for (const tenant of tenants) {
    await db.transaction(async (trx) => {
      await migration.up(trx, { tenantId: tenant.id });
    });
  }
}
```

Never mix tenant data in migrations.

## Performance Considerations

| Operation | Time | Strategy |
|-----------|------|----------|
| Add column (nullable) | < 1s | Online (no lock) |
| Add index | 1-10min | Background |
| Remove column | < 1s | Online |
| Backfill 1M rows | 5-10min | Batched |
| Rename table | < 1s | Online |

Avoid:
- ❌ ALTER TABLE ... MODIFY (full rewrite)
- ❌ Backfill in single transaction
- ❌ Foreign key constraints on large tables
- ❌ Migrations during peak hours

## Rollback Testing

Always test rollback:

```bash
# Apply migration
npm run db:migrate

# Verify works
npm run test --workspace=@intcloudsysops/api

# Rollback
npm run db:rollback

# Verify still works
npm run test --workspace=@intcloudsysops/api
```

## Dependencies

### This Module Depends On

None

### Modules That Depend On This

- All services that interact with database
- CI/CD pipeline — Migration execution

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Migration examples
