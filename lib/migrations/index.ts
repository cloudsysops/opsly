export interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationRunner {
  private migrations: Migration[] = [];

  register(migration: Migration) {
    this.migrations.push(migration);
  }

  async runAll() {
    for (const migration of this.migrations.sort((a, b) => 
      a.version.localeCompare(b.version)
    )) {
      try {
        await migration.up();
        console.log(`✅ Migration ${migration.version}: ${migration.name}`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  async rollback(version: string) {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration) throw new Error(`Migration ${version} not found`);
    
    await migration.down();
    console.log(`⬅️ Rolled back ${version}`);
  }
}
