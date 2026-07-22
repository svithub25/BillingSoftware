export const migration_012_cleanup_legacy_schema = {
  name: "012_cleanup_legacy_schema",
  up(db) {
    // Disable foreign keys to allow dropping tables and columns safely
    db.exec("PRAGMA foreign_keys = OFF;");

    db.prepare("BEGIN TRANSACTION").run();
    try {
      // 1. Create new tables without legacy columns
      db.exec(`
        CREATE TABLE new_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sku TEXT ,
          hsn_code TEXT,
          description TEXT,
          unit TEXT DEFAULT 'pcs',
          mrp REAL DEFAULT 0,
          purchase_rate REAL DEFAULT 0,
          sale_rate REAL DEFAULT 0,
          gst_percentage REAL DEFAULT 0,
          category_id INTEGER DEFAULT NULL,
          current_stock INTEGER DEFAULT 0,
          minimum_stock INTEGER DEFAULT 10,
          last_contact_id INTEGER DEFAULT NULL,
          last_purchase_date DATETIME DEFAULT NULL,
          status_code INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        );
        
        CREATE TABLE new_purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER DEFAULT NULL,
          invoice_number TEXT,
          purchase_date DATE NOT NULL,
          total_amount REAL DEFAULT 0,
          cgst_total REAL DEFAULT 0,
          sgst_total REAL DEFAULT 0,
          discount REAL DEFAULT 0,
          rounding_off REAL DEFAULT 0,
          status_code INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts (id)
        );

        CREATE TABLE new_sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT UNIQUE NOT NULL,
          contact_id INTEGER DEFAULT NULL,
          salesman_id INTEGER DEFAULT NULL,
          sale_type TEXT DEFAULT 'customer',
          sale_date DATE NOT NULL,
          discount REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          rounding_off REAL DEFAULT 0,
          cgst_total REAL DEFAULT 0,
          sgst_total REAL DEFAULT 0,
          status_code INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts (id)
        );
      `);

      // 2. Copy data (selecting only remaining columns)
      db.exec(`
        INSERT INTO new_items (id, name, sku, hsn_code, description, unit, mrp, purchase_rate, sale_rate, gst_percentage, category_id, current_stock, minimum_stock, last_contact_id, last_purchase_date, status_code, created_at)
        SELECT id, name, sku, hsn_code, description, unit, mrp, purchase_rate, sale_rate, gst_percentage, category_id, current_stock, minimum_stock, last_contact_id, last_purchase_date, status_code, created_at FROM items;
        
        INSERT INTO new_purchases (id, contact_id, invoice_number, purchase_date, total_amount, cgst_total, sgst_total, discount, rounding_off, status_code, created_at)
        SELECT id, contact_id, invoice_number, purchase_date, total_amount, cgst_total, sgst_total, discount, rounding_off, status_code, created_at FROM purchases;
        
        INSERT INTO new_sales (id, bill_number, contact_id, salesman_id, sale_type, sale_date, discount, total_amount, rounding_off, cgst_total, sgst_total, status_code, created_at)
        SELECT id, bill_number, contact_id, salesman_id, sale_type, sale_date, discount, total_amount, rounding_off, cgst_total, sgst_total, status_code, created_at FROM sales;
      `);

      // 3. Drop old tables
      db.exec("DROP TABLE items;");
      db.exec("DROP TABLE purchases;");
      db.exec("DROP TABLE sales;");

      // 4. Rename new tables
      db.exec("ALTER TABLE new_items RENAME TO items;");
      db.exec("ALTER TABLE new_purchases RENAME TO purchases;");
      db.exec("ALTER TABLE new_sales RENAME TO sales;");

      // 5. Recreate indexes from index.js for these 3 tables
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
        CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
        CREATE INDEX IF NOT EXISTS idx_items_hsn_code ON items(hsn_code);
        CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status_code);
        CREATE INDEX IF NOT EXISTS idx_items_current_stock ON items(current_stock);
        CREATE INDEX IF NOT EXISTS idx_items_low_stock ON items(current_stock, minimum_stock);

        CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
        CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON purchases(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status_code);
        
        CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
        CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
        CREATE INDEX IF NOT EXISTS idx_sales_salesman_id ON sales(salesman_id);
        CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);
        CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status_code);
        CREATE INDEX IF NOT EXISTS idx_sales_date_salesman ON sales(sale_date, salesman_id);
      `);

      // 6. Drop legacy tables that are no longer used
      db.exec("DROP TABLE IF EXISTS customer");
      db.exec("DROP TABLE IF EXISTS suppliers");
      db.exec("DROP TABLE IF EXISTS payment_verification");
      db.exec("DROP TABLE IF EXISTS bank_transactions_old");
      db.exec("DROP TABLE IF EXISTS bank_ledger_entries_old");
      db.exec("DROP TABLE IF EXISTS post_dated_cheques");
      db.exec("DROP TABLE IF EXISTS transaction_categories_old");

      db.prepare("COMMIT").run();
    } catch (error) {
      db.prepare("ROLLBACK").run();
      console.error("Error in cleanup migration:", error);
      throw error;
    } finally {
      // Re-enable foreign keys
      db.exec("PRAGMA foreign_keys = ON;");
    }
  },
  down(db) {
    console.warn("Down migration for schema cleanup is not fully supported.");
  },
};
