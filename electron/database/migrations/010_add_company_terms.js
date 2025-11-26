export const migration_010_add_company_terms = {
  name: '010_add_company_terms',
  up(db) {
    db.exec(`
      ALTER TABLE company_info ADD COLUMN terms_1 TEXT DEFAULT '';
      ALTER TABLE company_info ADD COLUMN terms_2 TEXT DEFAULT '';
      ALTER TABLE company_info ADD COLUMN terms_3 TEXT DEFAULT '';
      ALTER TABLE company_info ADD COLUMN terms_4 TEXT DEFAULT '';
      ALTER TABLE company_info ADD COLUMN terms_5 TEXT DEFAULT '';
    `);
  }
};