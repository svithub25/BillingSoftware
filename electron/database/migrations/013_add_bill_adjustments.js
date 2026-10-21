export const migration_013_add_bill_adjustments = {
  name: "013_add_bill_adjustments",
  up(db) {
    const addCol = (table, colDef) => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
      } catch (e) {
        if (!e.message.includes("duplicate column")) {
          console.warn(`Could not add column ${colDef} to ${table}:`, e.message);
        }
      }
    };

    // Add payment tracking to sales
    addCol('sales', "payment_status TEXT DEFAULT 'pending'");
    addCol('sales', "paid_amount REAL DEFAULT 0");

    // Add payment tracking to purchases
    addCol('purchases', "payment_status TEXT DEFAULT 'pending'");
    addCol('purchases', "paid_amount REAL DEFAULT 0");

    db.exec(`
      -- Create bill adjustments table
      CREATE TABLE IF NOT EXISTS bill_adjustments (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id      INTEGER NOT NULL,
        invoice_id          INTEGER,
        purchase_id         INTEGER,
        adjusted_amount     REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id)     REFERENCES sales(id),
        FOREIGN KEY (purchase_id)    REFERENCES purchases(id)
      );

      CREATE INDEX IF NOT EXISTS idx_bill_adjustments_txn ON bill_adjustments(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_bill_adjustments_invoice ON bill_adjustments(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_bill_adjustments_purchase ON bill_adjustments(purchase_id);
    `);
    console.log('Migration 013: Added bill adjustments successfully.');
  },
};
