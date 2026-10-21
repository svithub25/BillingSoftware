export const migration_008_add_customer_fields = {
  name: "008_add_customer_fields",
  up(db) {
    const addCol = (table, colDef) => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
      } catch (e) {
        if (!e.message.includes("duplicate column")) {
          console.warn(
            `Could not add column ${colDef} to ${table}:`,
            e.message,
          );
        }
      }
    };

    addCol("customer", "email TEXT");
    addCol("customer", "state TEXT");
    addCol("customer", "city TEXT");
    addCol("customer", "country TEXT DEFAULT 'India'");
    addCol("customer", "pincode TEXT");
    addCol("customer", "credit_limit REAL DEFAULT 0");
    addCol("customer", "credit_days INTEGER DEFAULT 0");
  },
};
