# Database Migrations

This directory contains SQL migration files for the Content AI Backend database schema.

## Migration System

The project uses a custom migration system that tracks applied migrations in the `schema_migrations` table.

## Available Commands

- `bun run migration:run` - Run all pending migrations
- `bun run migration:create <name>` - Create a new migration file
- `bun run migration:status` - Show migration status

## Migration Files

### 001_initial_schema.sql
Creates the complete initial database schema including:
- All enum types
- All tables (channels, media_assets, articles, posts, knowledge_sources, knowledge_chunks, knowledge_source_channels, recipients, newsletters)
- All necessary indexes
- pgvector extension

### 003_create_migration_tracking.sql
Creates the migration tracking table and marks the initial schema as applied.

## Creating New Migrations

When you need to make changes to the database schema:

1. Create a new migration:
   ```bash
   bun run migration:create add_new_column_to_table
   ```

2. Edit the generated file with your SQL changes:
   ```sql
   -- Example: Add a new column
   ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
   
   -- Example: Create an index
   CREATE INDEX IF NOT EXISTS idx_table_new_column ON table_name(new_column);
   ```

3. Run the migration:
   ```bash
   bun run migration:run
   ```

## Migration Naming Convention

- Prefix with timestamp (auto-generated)
- Use descriptive names (snake_case)
- Example: `004_add_user_preferences_table.sql`

## Important Notes

- Migrations are run in alphabetical order
- Always check if tables exist before creating (use IF NOT EXISTS)
- Use IF NOT EXISTS for indexes to prevent errors on re-runs
- Each migration should be atomic and reversible if possible
- Test migrations in development before applying to production

## Checking Migration Status

To see which migrations are pending:
```bash
bun run migration:status
```

This will show you any migrations that haven't been applied yet.
