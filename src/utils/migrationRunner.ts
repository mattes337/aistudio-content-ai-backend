import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface Migration {
  fileName: string;
  sql: string;
}

export class MigrationRunner {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    } finally {
      client.release();
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT migration_name FROM schema_migrations ORDER BY migration_name');
      return result.rows.map(row => row.migration_name);
    } finally {
      client.release();
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    await this.ensureMigrationTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.warn('Migrations directory not found:', migrationsDir);
      return [];
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations are applied in order

    const pendingMigrations: Migration[] = [];

    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        pendingMigrations.push({ fileName: file, sql });
      }
    }

    return pendingMigrations;
  }

  async runMigrations(): Promise<void> {
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply.');
      return;
    }

    console.log(`Applying ${pendingMigrations.length} migration(s)...`);

    for (const migration of pendingMigrations) {
      console.log(`Applying migration: ${migration.fileName}`);

      // Check if migration contains ALTER TYPE ADD VALUE (can't run in transaction)
      const requiresNoTransaction = /ALTER\s+TYPE\s+\w+\s+ADD\s+VALUE/i.test(migration.sql);

      const client = await this.pool.connect();

      try {
        if (requiresNoTransaction) {
          // Run without transaction for ALTER TYPE ADD VALUE
          console.log(`  (running outside transaction - contains ALTER TYPE ADD VALUE)`);
          await client.query(migration.sql);
          await client.query(
            'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
            [migration.fileName]
          );
        } else {
          // Run with transaction for normal migrations
          await client.query('BEGIN');
          try {
            await client.query(migration.sql);
            await client.query(
              'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
              [migration.fileName]
            );
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }
        console.log(`✓ Migration ${migration.fileName} applied successfully`);
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.fileName}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('All migrations applied successfully.');
  }

  async rollbackMigration(migrationName: string): Promise<void> {
    // This is a simplified rollback - in production you might want to store rollback SQL
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        'DELETE FROM schema_migrations WHERE migration_name = $1',
        [migrationName]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${migrationName} rolled back (manual cleanup required)`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to rollback migration ${migrationName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createMigration(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const fileName = `${timestamp}_${name}.sql`;
    const filePath = path.join(__dirname, '../../database/migrations', fileName);
    
    const template = `-- Migration: ${fileName}
-- Description: Add your migration description here

-- Add your SQL statements here
-- Example:
-- ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
-- CREATE INDEX IF NOT EXISTS idx_table_new_column ON table_name(new_column);
`;
    
    fs.writeFileSync(filePath, template);
    console.log(`Migration file created: ${filePath}`);
    return filePath;
  }
}

// CLI usage function
export async function runMigrationsCLI(): Promise<void> {
  // You would typically get the pool from your database configuration
  // This is a simplified example
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const runner = new MigrationRunner(pool);
  
  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'run':
        await runner.runMigrations();
        break;
      case 'create':
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('Please provide a migration name');
          process.exit(1);
        }
        await runner.createMigration(migrationName);
        break;
      case 'status':
        const pending = await runner.getPendingMigrations();
        console.log(`Pending migrations: ${pending.length}`);
        pending.forEach(m => console.log(`  - ${m.fileName}`));
        break;
      default:
        console.log('Usage:');
        console.log('  npm run migration run     - Run all pending migrations');
        console.log('  npm run migration create name - Create a new migration file');
        console.log('  npm run migration status  - Show migration status');
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
