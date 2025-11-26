export const migration_008_add_customer_fields = {
  name: '008_add_customer_fields',
  up(db) {
    db.exec(`
      ALTER TABLE customer ADD COLUMN email TEXT;
      ALTER TABLE customer ADD COLUMN state TEXT;
      ALTER TABLE customer ADD COLUMN city TEXT;
      ALTER TABLE customer ADD COLUMN country TEXT DEFAULT 'India';
      ALTER TABLE customer ADD COLUMN pincode TEXT;
      ALTER TABLE customer ADD COLUMN credit_limit REAL DEFAULT 0;
      ALTER TABLE customer ADD COLUMN credit_days INTEGER DEFAULT 0;
    `);
  }
};