# Content AI Backend - Deployment and Migration Guide

This document outlines the deployment process, database migration, and configuration file locations for the Content AI Backend application.

## Table of Contents
1.  [Prerequisites](#prerequisites)
2.  [Database Migration](#database-migration)
3.  [Deployment with Docker](#deployment-with-docker)
4.  [Configuration File Locations](#configuration-file-locations)
5.  [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL client tools (optional, for direct database access)
- Environment variables properly configured in `.env` file

---

## Database Migration

### Initial Setup

The database is automatically initialized using the init script located at:
```
./database/init.sql
```

This script includes:
- PostgreSQL extensions (pgvector for embeddings)
- Custom enum types for data integrity
- All table definitions with proper relationships
- Indexes for optimal query performance

### Schema Updates

When updating the database schema:

1. **Manual Migration (Development)**:
   ```bash
   # Connect to the running database container
   docker exec -it aistudio-postgres psql -U aistudio_user -d aistudio_content

   # Run your SQL commands
   ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
   ```

2. **Migration Scripts (Production)**:
   Create migration scripts in the `database/migrations/` directory and execute them in order.

### Synchronization with Documentation

The database schema is synchronized with the documentation located at:
```
./docs/database_schema.md
```

Ensure both files remain consistent after any schema changes.

---

## Deployment with Docker

### Quick Start

1. **Start only the database**:
   ```bash
   docker-compose up -d postgres
   ```

2. **Start all services** (production mode):
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Start all services** (development mode):
   ```bash
   docker-compose up -d
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f
   ```

### Verification

Once deployed, verify the services are running:

1. **Check container status**:
   ```bash
   docker ps -a --filter "name=aistudio-"
   ```

2. **Check application health**:
   ```bash
   # On Windows PowerShell:
   Invoke-RestMethod -Uri http://localhost:3000/health -Method GET
   
   # On Unix/macOS:
   curl http://localhost:3000/health
   ```

3. **Check database tables**:
   ```bash
   docker exec aistudio-postgres psql -U aistudio_user -d aistudio_content -c "\dt"
   ```

### Service Configuration

#### PostgreSQL Database
- **Image**: pgvector/pgvector:pg16
- **Port**: 5432 (mapped to host)
- **Database**: aistudio_content
- **User**: aistudio_user
- **Volume**: Persistent data stored in Docker volume

#### Backend Application
- **Build Context**: Current directory
- **Port**: 3000 (mapped to host)
- **Environment**: Production
- **Dependencies**: PostgreSQL container
- **Volumes**: Uploads directory mounted

### Environment Variables

Production configuration is set in `docker-compose.yml`:
```yaml
environment:
  NODE_ENV: production
  DATABASE_URL: postgresql://aistudio_user:aistudio_password@postgres:5432/aistudio_content
  PORT: 3000
  JWT_SECRET: your-jwt-secret-change-in-production
  GEMINI_API_KEY: ${GEMINI_API_KEY}
```

Development override is in `docker-compose.override.yml`:
```yaml
environment:
  NODE_ENV: development
  DATABASE_URL: postgresql://aistudio_test_user:aistudio_test_password@postgres:5432/aistudio_content_test
  LOG_LEVEL: debug
```

### Common Issues and Solutions

1. **Database Connection Failed**:
   - Ensure PostgreSQL container is running
   - Check if the database is fully initialized (wait ~30 seconds after container start)
   - Verify environment variables match

2. **Permission Issues**:
   - Docker containers run as root by default
   - Ensure volume mounts have correct permissions

3. **Port Conflicts**:
   - Check if ports 3000 and 5432 are available on the host
   - Modify port mappings in docker-compose.yml if needed

---

## Configuration File Locations

### Database Schema
1. **SQL Definition**: `./database/init.sql`
   - Executed automatically on database initialization
   - Contains all DDL statements for tables, indexes, and constraints

2. **Documentation**: `./docs/database_schema.md`
   - Human-readable schema documentation
   - Includes ERD diagrams and field descriptions
   - Should be kept in sync with init.sql

### REST API Documentation
1. **API Specification**: `./docs/rest_schema.md`
   - Complete REST API endpoint documentation
   - Includes request/response examples
   - Authentication requirements

### Application Configuration
1. **Docker Compose**: `./docker-compose.yml`
   - Production service definitions
   - Network and volume configurations

2. **Docker Override**: `./docker-compose.override.yml`
   - Development-specific overrides
   - Volume mounts for live code reloading

3. **Environment**: `.env` (not tracked in git)
   - Contains sensitive configuration
   - API keys and secrets
   - Database credentials override

4. **Dockerfile**: `./Dockerfile`
   - Application build instructions
   - Runtime dependencies

---

## Development Workflow

### Making Schema Changes

1. Update `./database/init.sql` with new DDL
2. Update `./docs/database_schema.md` documentation
3. Test changes in development:
   ```bash
   docker-compose down -v
   docker-compose -f docker-compose.yml up -d postgres
   ```
4. Verify tables are created correctly:
   ```bash
   docker exec aistudio-postgres psql -U aistudio_user -d aistudio_content -c "\dt"
   ```

### Updating API Documentation

1. Modify `./docs/rest_schema.md`
2. Ensure implementation matches documentation
3. Test endpoints using tools like Postman or curl

### Production Deployment

1. Ensure `.env` file is properly configured
2. Remove test volumes if any:
   ```bash
   docker-compose down -v
   ```
3. Deploy with production configuration:
   ```bash
   docker-compose up -d
   ```
4. Monitor logs for any issues:
   ```bash
   docker-compose logs -f backend
   ```

---

## Troubleshooting

### Database Issues

**Symptom**: "role does not exist" error
- **Cause**: Docker volume from previous run with different user
- **Solution**: Remove volume and recreate:
  ```bash
  docker-compose down -v
  docker-compose up -d postgres
  ```

**Symptom**: Tables not found
- **Cause**: Init script didn't execute
- **Solution**: Check init.sql is properly mounted and has correct permissions

### Application Issues

**Symptom**: Application can't connect to database
- **Cause**: Database not ready, wrong credentials, or network issues
- **Solution**: 
  1. Wait for database to be ready
  2. Verify environment variables
  3. Check network connectivity

**Symptom**: Uploads not working
- **Cause**: Volume mount not configured correctly
- **Solution**: Ensure uploads directory exists and has proper permissions

### General Tips

- Always remove `-v` flag when downing containers only if you want to delete data
- Use `docker logs <container>` to inspect issues
- Check if ports are available before starting services
- Ensure environment variables are correctly set in both containers

---

## Synchronizing Documentation

The documentation files in `./docs/` are synchronized with the source project:
- Source: `D:\Test\aistudio-content-ai-manager\docs\`
- Target: `D:\Test\aistudio-content-ai-backend\docs\`

When updating schema or API:
1. Update both the implementation files (init.sql, code)
2. Update documentation in the manager project
3. Copy updated documentation to backend project
4. Test that documentation matches implementation

This ensures consistency between the manager documentation and backend implementation.

---

## Swagger/OpenAPI Documentation

### Overview

The Content AI Backend includes Swagger/OpenAPI 3.0 documentation accessible at:
- **Swagger UI**: `http://localhost:3000/api-docs` (development)
- **Production URL**: `https://your-domain.com/api-docs`

### Documentation Structure

- **Configuration**: `./src/config/swagger.ts`
- **API Documentation**: Generated from route files using JSDoc comments
- **Schema Definitions**: Defined in swagger configuration file

### Updating Documentation

When making changes to the API:

1. **Route Changes**: Update JSDoc comments in route files (e.g., `./src/routes/channels.ts`)
2. **Schema Changes**: Update schema definitions in `./src/config/swagger.ts`
3. **New Endpoints**: Add complete Swagger documentation with:
   - `@swagger` tag
   - HTTP method and path
   - Summary and tags
   - Security requirements
   - Request/response schemas
   - Error responses

### Documentation Requirements

All API endpoints must include:
- **Summary**: Brief description of the endpoint
- **Tags**: Group endpoints by resource (e.g., [Channels], [Media Assets])
- **Security**: JWT bearer authentication (unless public endpoint)
- **Parameters**: Path/query parameters with types and descriptions
- **Request Body**: Schema for POST/PUT requests
- **Responses**: All possible response codes with schemas
- **Error Handling**: 4xx and 5xx error responses

### Example Documentation

```javascript
/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: Get all channels
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Channel'
 *       500:
 *         description: Internal server error
 */
router.get('/', ChannelController.getChannels);
```

### Schema Definitions

Reusable schemas should be defined in `./src/config/swagger.ts` under the `components.schemas` section:
- **Request Schemas**: For POST/PUT operations (e.g., CreateChannelRequest)
- **Response Schemas**: For GET operations (e.g., Channel)
- **Error Schemas**: For standardized error responses

### Accessing Documentation

- **Development**: Start the application and navigate to `/api-docs`
- **Testing**: Use Swagger UI to test endpoints with authentication
- **Export**: Download OpenAPI JSON specification from `/api-docs/json`

### Automated Updates

When adding new routes or modifying existing ones:
1. Update the JSDoc comments in the route file
2. Restart the development server
3. Verify documentation appears correctly in Swagger UI
4. Test the endpoints using the Swagger UI interface
