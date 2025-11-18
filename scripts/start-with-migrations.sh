#!/bin/bash
# Start services
docker-compose up -d postgres

# Wait for database to be ready
echo "Waiting for database to start..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker-compose exec backend bun run migration:run

# Start backend
echo "Starting backend service..."
docker-compose up -d backend

echo "Services started successfully!"
echo "Backend: http://localhost:3000"
echo "API Docs: http://localhost:3000/api-docs"
