export const migration_009_add_salesman_fields = {
  name: "009_add_salesman_fields",
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

    addCol("salesman", "email TEXT");
    addCol("salesman", "state TEXT");
    addCol("salesman", "city TEXT");
    addCol("salesman", "country TEXT DEFAULT 'India'");
    addCol("salesman", "pincode TEXT");
    addCol("salesman", "gstin TEXT");
    addCol("salesman", "credit_limit REAL DEFAULT 0");
    addCol("salesman", "credit_days INTEGER DEFAULT 0");
    addCol("salesman", "working_area TEXT");
  },
};
