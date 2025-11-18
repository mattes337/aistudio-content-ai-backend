#!/usr/bin/env node

import { Pool } from 'pg';
import { MigrationRunner } from '../src/utils/migrationRunner';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://aistudio_user:aistudio_password@localhost:5432/aistudio_content'
  });

  const runner = new MigrationRunner(pool);
  
  try {
    await runner.runMigrations();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
