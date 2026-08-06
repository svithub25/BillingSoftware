import { migration_006_add_shipped_to_sales } from "./migrations/006_add_shipped_to_sales.js";
import { migration_007_add_supplier_fields } from "./migrations/007_add_supplier_fields.js";
import { migration_008_add_customer_fields } from "./migrations/008_add_customer_fields.js";
import { migration_009_add_salesman_fields } from "./migrations/009_add_salesman_fields.js";
import { migration_010_fixing_issue_batch_edit } from "./migrations/010_fixing_issue_batch_edit.js";
import { migration_011_unified_accounting_migration } from "./migrations/011_unified_accounting_migration.js";
import { migration_012_cleanup_legacy_schema } from "./migrations/012_cleanup_legacy_schema.js";
import { migration_013_add_bill_adjustments } from "./migrations/013_add_bill_adjustments.js";
import { migration_014_add_discounts_and_types } from "./migrations/014_add_discounts_and_types.js";
import { migration_015_migrate_invoices_to_ledger } from "./migrations/015_migrate_invoices_to_ledger.js";

const migrations = [
  migration_006_add_shipped_to_sales,
  migration_007_add_supplier_fields,
  migration_008_add_customer_fields,
  migration_009_add_salesman_fields,
  migration_010_fixing_issue_batch_edit,
  migration_011_unified_accounting_migration,
  migration_012_cleanup_legacy_schema,
  migration_013_add_bill_adjustments,
  migration_014_add_discounts_and_types,
  migration_015_migrate_invoices_to_ledger,
];

export function runMigrations(db) {
  migrations.forEach((migration) => {
    const exists = db
      .prepare("SELECT 1 FROM schema_migrations WHERE migration_name = ?")
      .get(migration.name);

    if (!exists) {
      console.log(`Running migration: ${migration.name}`);
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (migration_name) VALUES (?)",
      ).run(migration.name);
    }
  });
}
