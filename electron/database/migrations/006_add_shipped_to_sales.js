export const migration_006_add_shipped_to_sales = {
  name: '006_add_shipped_to_sales',
  up: (db) => {
    const addCol = (table, colDef) => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
      } catch (e) {
        if (!e.message.includes("duplicate column")) {
          console.warn(`Could not add column ${colDef} to ${table}:`, e.message);
        }
      }
    };

    // Add shipped_to columns to sales table
    addCol('sales', 'shipped_to_name TEXT');
    addCol('sales', 'shipped_to_contact TEXT');
    addCol('sales', 'shipped_to_address TEXT');
    addCol('sales', 'shipped_to_gstin TEXT');
    addCol('sales', 'is_shipped_different INTEGER DEFAULT 0');

    console.log('✅ Migration 006: Added shipped_to columns to sales table');
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    // For now, just log that rollback is not fully supported
    console.log('⚠️ Rollback for migration 006 requires manual intervention');
  }
};