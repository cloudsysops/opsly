---
title: "@intcloudsysops/migrations"
description: "Database migration versioning and rollback"
---
# @intcloudsysops/migrations

Safe database schema versioning with rollback capability and audit trails.

## Features

- 📝 **Version Control** — Track schema changes with versions
- ↩️ **Rollback** — Revert to previous schema version
- 🔍 **Audit Trail** — Who ran what migration when
- 🔒 **Safety Checks** — Validate before/after migration
- 📊 **Status Tracking** — Monitor migration progress

## Usage

### Define a Migration

```typescript
import { Migration } from '@intcloudsysops/migrations';

const migration: Migration = {
  version: '001',
  name: 'create-agents-table',
  
  async up(db) {
    await db.schema.createTable('agents', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.string('name').notNullable();
      table.enum('status', ['active', 'disabled']).defaultTo('active');
      table.timestamps();
    });
  },

  async down(db) {
    await db.schema.dropTableIfExists('agents');
  }
};
```

### Run Migrations

```typescript
import { MigrationRunner } from '@intcloudsysops/migrations';

const runner = new MigrationRunner(db);

// Register migrations
runner.register(createAgentsTable);
runner.register(addAgentPrompts);
runner.register(createTenantConfig);

// Run all pending migrations
await runner.runAll();
// Migrations: 001 ✓ 002 ✓ 003 ✓
```

### Rollback to Previous Version

```typescript
const runner = new MigrationRunner(db);

// Rollback to version 001
await runner.rollback('001');

// Or rollback last migration
await runner.rollback('latest');
```

## Migration Structure

```typescript
interface Migration {
  version: string;           // e.g., '001', '002', '2024-05-09'
  name: string;              // Descriptive name
  up(db: Database): Promise<void>;   // Forward migration
  down(db: Database): Promise<void>; // Rollback
}
```

## Integration by Service

### Application Startup

```typescript
import { MigrationRunner } from '@intcloudsysops/migrations';
import * as migrations from './migrations';

async function startApp() {
  const db = createDatabase();
  const runner = new MigrationRunner(db);

  // Register all migrations
  Object.values(migrations).forEach(m => runner.register(m));

  // Run pending migrations
  const results = await runner.runAll();
  console.log(`${results.length} migration(s) applied`);

  // Start server
  app.listen(3000);
}
```

### Multi-Tenant Migration

```typescript
async function runTenantMigrations(tenantId, db) {
  const runner = new MigrationRunner(db);

  // Get migration status
  const status = await runner.getStatus();
  console.log(`Pending: ${status.pending.length}`);

  // Run migrations for specific tenant
  const results = await runner.runAll({
    tenantId,  // Tenant context
    dryRun: false
  });

  return results;
}
```

## Migration Best Practices

✅ **Do:**
- Write both `up()` and `down()` methods
- Keep migrations small and focused
- Test migrations in staging first
- Include data transformation if needed
- Add indexes for new foreign keys

❌ **Don't:**
- Assume column order
- Use raw SQL without escaping
- Create migrations without rollback plan
- Run migrations on production directly
- Mix schema changes with data changes

## Example: Add Column

```typescript
const migration: Migration = {
  version: '002',
  name: 'add-agent-description',

  async up(db) {
    await db.schema.alterTable('agents', (table) => {
      table.text('description').nullable();
    });
  },

  async down(db) {
    await db.schema.alterTable('agents', (table) => {
      table.dropColumn('description');
    });
  }
};
```

## Example: Backfill Data

```typescript
const migration: Migration = {
  version: '003',
  name: 'backfill-agent-status',

  async up(db) {
    // First add column
    await db.schema.alterTable('agents', (table) => {
      table.enum('status', ['active', 'disabled']).defaultTo('active');
    });

    // Then backfill existing records
    await db.from('agents')
      .where('created_at', '<', db.raw("now() - interval '30 days'"))
      .update({ status: 'disabled' });
  },

  async down(db) {
    await db.schema.alterTable('agents', (table) => {
      table.dropColumn('status');
    });
  }
};
```

## See Also

- `GOVERNANCE.md` — Migration standards, review process
- `__tests__/` — Migration examples

---

## Enlaces relacionados

- [[lib/migrations/README|migrations]]
- [[README|Inicio]]
