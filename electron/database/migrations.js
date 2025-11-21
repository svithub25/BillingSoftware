
import { migration_006_add_shipped_to_sales } from './migrations/006_add_shipped_to_sales.js';

const migrations = [
   migration_006_add_shipped_to_sales
];

export function runMigrations(db) {
  migrations.forEach(migration => {
    const exists = db.prepare(
      'SELECT 1 FROM schema_migrations WHERE migration_name = ?'
    ).get(migration.name);

    if (!exists) {
      console.log(`Running migration: ${migration.name}`);
      migration.up(db);
      db.prepare(
        'INSERT INTO schema_migrations (migration_name) VALUES (?)'
      ).run(migration.name);
    }
  });
}