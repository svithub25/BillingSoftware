
import { migration_006_add_shipped_to_sales } from './migrations/006_add_shipped_to_sales.js';
import { migration_007_add_supplier_fields } from './migrations/007_add_supplier_fields.js';
import { migration_008_add_customer_fields } from './migrations/008_add_customer_fields.js';
import { migration_009_add_salesman_fields } from './migrations/009_add_salesman_fields.js';
import { migration_010_add_company_terms } from './migrations/010_add_company_terms.js';


const migrations = [
   migration_006_add_shipped_to_sales,
   migration_007_add_supplier_fields,
    migration_008_add_customer_fields, 
    migration_009_add_salesman_fields,
    migration_010_add_company_terms
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