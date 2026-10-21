export const migration_007_add_supplier_fields = {
  name: "007_add_supplier_fields",
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

    addCol("suppliers", "email TEXT");
    addCol("suppliers", "state TEXT");
    addCol("suppliers", "city TEXT");
    addCol("suppliers", "country TEXT DEFAULT 'India'");
    addCol("suppliers", "pincode TEXT");
    addCol("suppliers", "credit_days INTEGER DEFAULT 0");
  },
};
