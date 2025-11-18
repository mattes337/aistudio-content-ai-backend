import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    const client = await pool.connect();
    
    // Check if tables already exist
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'channels'
    `);
    
    if (parseInt(result.rows[0].count) > 0) {
      console.log('Database already initialized, skipping migrations...');
      client.release();
      return;
    }
    
    // Read and execute the init.sql file
    const initSqlPath = path.join(process.cwd(), 'database', 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    console.log('Running database migrations...');
    await client.query(initSql);
    
    console.log('Migrations completed successfully');
    client.release();
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
