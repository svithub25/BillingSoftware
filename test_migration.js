import { initDatabase } from './electron/database/index.js';
import { runMigrations } from './electron/database/migrations.js';

try {
  console.log('Initializing DB...');
  const db = initDatabase('test_database.db');
  console.log('Database initialized successfully.');
  console.log('Running migrations...');
  runMigrations(db);
  console.log('Migrations completed successfully.');
} catch (e) {
  console.error('Error during migration:', e);
}
