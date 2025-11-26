export const migration_009_add_salesman_fields = {
  name: '009_add_salesman_fields',
  up(db) {
    db.exec(`
      ALTER TABLE salesman ADD COLUMN email TEXT;
      ALTER TABLE salesman ADD COLUMN state TEXT;
      ALTER TABLE salesman ADD COLUMN city TEXT;
      ALTER TABLE salesman ADD COLUMN country TEXT DEFAULT 'India';
      ALTER TABLE salesman ADD COLUMN pincode TEXT;
      ALTER TABLE salesman ADD COLUMN gstin TEXT;
      ALTER TABLE salesman ADD COLUMN credit_limit REAL DEFAULT 0;
      ALTER TABLE salesman ADD COLUMN credit_days INTEGER DEFAULT 0;
      ALTER TABLE salesman ADD COLUMN working_area TEXT;
    `);
  }
};