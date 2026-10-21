export const migration_014_add_discounts_and_types = {
  name: "014_add_discounts_and_types",
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

    addCol("sales", "discount_type TEXT DEFAULT 'percent'");
    addCol("sales", "discount_amount REAL DEFAULT 0");
    addCol("sale_items", "discount REAL DEFAULT 0");
    addCol("sale_items", "discount_amount REAL DEFAULT 0");
    addCol("sale_items", "discount_type TEXT DEFAULT 'percent'");

    console.log("Migration 014: Added discounts and types successfully.");
  },
};
