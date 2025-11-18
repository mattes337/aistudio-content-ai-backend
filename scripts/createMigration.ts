#!/usr/bin/env node

import { Pool } from 'pg';
import { MigrationRunner } from '../src/utils/migrationRunner';

async function main() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('Please provide a migration name');
    console.log('Usage: bun run migration:create <migration-name>');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://aistudio_user:aistudio_password@localhost:5432/aistudio_content'
  });

  const runner = new MigrationRunner(pool);
  
  try {
    const filePath = await runner.createMigration(migrationName);
    console.log(`Migration file created: ${filePath}`);
    console.log('Edit the file with your SQL changes, then run: bun run migration:run');
  } catch (error) {
    console.error('Failed to create migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
