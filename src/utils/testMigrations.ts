#!/usr/bin/env node

import { Pool } from 'pg';
import { MigrationRunner } from './migrationRunner';

async function testMigrationSystem() {
  console.log('Testing migration system...\n');
  
  // Use a test database
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL
  });

  const runner = new MigrationRunner(pool);
  
  try {
    // Ensure we're starting with a clean slate
    console.log('1. Ensuring migration table exists...');
    await runner.ensureMigrationTable();
    console.log('✓ Migration table exists\n');
    
    // Check applied migrations
    console.log('2. Checking applied migrations...');
    const applied = await runner.getAppliedMigrations();
    console.log(`Currently applied migrations: ${applied.length}`);
    applied.forEach(m => console.log(`  - ${m}`));
    console.log();
    
    // Check pending migrations
    console.log('3. Checking pending migrations...');
    const pending = await runner.getPendingMigrations();
    console.log(`Pending migrations: ${pending.length}`);
    pending.forEach(m => console.log(`  - ${m.fileName}`));
    console.log();
    
    if (pending.length > 0) {
      console.log('4. Running pending migrations...');
      await runner.runMigrations();
      console.log('✓ All migrations applied\n');
    } else {
      console.log('4. No pending migrations to apply\n');
    }
    
    // Create a test migration
    console.log('5. Creating test migration...');
    const testPath = await runner.createMigration('test_migration');
    console.log(`✓ Created test migration: ${testPath}\n`);
    
    // Check if it's now pending
    console.log('6. Verifying test migration is pending...');
    const newPending = await runner.getPendingMigrations();
    const testMigration = newPending.find(m => m.fileName.includes('test_migration'));
    
    if (testMigration) {
      console.log('✓ Test migration appears as pending\n');
      
      // Clean up test migration
      const fs = await import('fs');
      fs.unlinkSync(testPath);
      console.log('7. Cleaned up test migration file\n');
    } else {
      console.log('✗ Test migration not found in pending list\n');
    }
    
    console.log('Migration system test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testMigrationSystem();
}
