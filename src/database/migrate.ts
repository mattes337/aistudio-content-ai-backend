import { pool } from '../config/database';
import { MigrationRunner } from '../utils/migrationRunner';

async function runMigrations() {
  const runner = new MigrationRunner(pool);
  
  try {
    await runner.runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

if (import.meta.main) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigrations;
