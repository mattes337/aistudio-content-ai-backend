# Use the official Bun image (pinned to avoid lockfile format mismatches)
FROM oven/bun:1.3.2-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies
RUN bun install && bun add ai @ai-sdk/google

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["bun", "run", "start"]
