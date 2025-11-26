export const migration_007_add_supplier_fields = {
  name: '007_add_supplier_fields',
  up(db) {
    db.exec(`
      ALTER TABLE suppliers ADD COLUMN email TEXT;
      ALTER TABLE suppliers ADD COLUMN state TEXT;
      ALTER TABLE suppliers ADD COLUMN city TEXT;
      ALTER TABLE suppliers ADD COLUMN country TEXT DEFAULT 'India';
      ALTER TABLE suppliers ADD COLUMN pincode TEXT;
      ALTER TABLE suppliers ADD COLUMN credit_days INTEGER DEFAULT 0;
    `);
  }
};