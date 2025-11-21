export const migration_006_add_shipped_to_sales = {
  name: '006_add_shipped_to_sales',
  up: (db) => {
    // Add shipped_to columns to sales table
    db.exec(`
      ALTER TABLE sales ADD COLUMN shipped_to_name TEXT;
      ALTER TABLE sales ADD COLUMN shipped_to_contact TEXT;
      ALTER TABLE sales ADD COLUMN shipped_to_address TEXT;
      ALTER TABLE sales ADD COLUMN shipped_to_gstin TEXT;
      ALTER TABLE sales ADD COLUMN is_shipped_different INTEGER DEFAULT 0;
    `);

    console.log('✅ Migration 006: Added shipped_to columns to sales table');
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    // For now, just log that rollback is not fully supported
    console.log('⚠️ Rollback for migration 006 requires manual intervention');
  }
};