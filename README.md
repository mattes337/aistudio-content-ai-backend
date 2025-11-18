# AI Studio Content Backend

A TypeScript backend built with Bun, Express, and PostgreSQL for managing AI-powered content creation and distribution across multiple platforms.

## Features

- **Multi-platform Content Management**: Support for websites, Instagram, Facebook, and X (Twitter)
- **Knowledge Base**: AI-powered knowledge ingestion and vector search capabilities
- **Content Generation**: Integrated with Google Gemini API for content and image generation
- **Media Asset Management**: Organized media library with categorization
- **Article & Post Management**: Full lifecycle management of content
- **Vector Search**: PostgreSQL with pgvector for semantic search capabilities
- **Docker Support**: Complete containerized deployment with Docker Compose

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: PostgreSQL with pgvector extension
- **Language**: TypeScript
- **Containerization**: Docker & Docker Compose
- **AI Integration**: Google Gemini API
- **Authentication**: JWT tokens

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Bun (for local development)
- Google Gemini API key

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your-gemini-api-key
```

### Docker Deployment

1. **Production Mode**:
```bash
docker-compose up -d
```

2. **Development Mode** (with hot reload):
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

The application will be available at `http://localhost:3000`

### Local Development

1. Install dependencies:
```bash
bun install
```

2. Start PostgreSQL container:
```bash
docker-compose up postgres -d
```

3. Run database migrations:
```bash
bun run db:migrate
```

4. Seed sample data (optional):
```bash
bun run db:seed
```

5. Start development server:
```bash
bun run dev
```

## API Endpoints

### Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Channels
- `GET /api/channels` - List all channels
- `POST /api/channels` - Create new channel
- `GET /api/channels/:id` - Get channel details
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel

### Media Assets
- `GET /api/media-assets` - List media assets
- `POST /api/media-assets` - Upload new asset
- `GET /api/media-assets/:id` - Get asset details
- `PUT /api/media-assets/:id` - Update asset
- `DELETE /api/media-assets/:id` - Delete asset

### Articles
- `GET /api/articles` - List articles
- `POST /api/articles` - Create article
- `GET /api/articles/:id` - Get article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Knowledge Sources
- `GET /api/knowledge-sources` - List knowledge sources
- `POST /api/knowledge-sources` - Create knowledge source
- `GET /api/knowledge-sources/:id` - Get source with chunks
- `PUT /api/knowledge-sources/:id` - Update source
- `DELETE /api/knowledge-sources/:id` - Delete source
- `POST /api/knowledge-sources/:id/reingest` - Re-process source

### AI Services
- `POST /api/ai/generate/article` - Generate article content
- `POST /api/ai/generate/article-title` - Generate title from content
- `POST /api/ai/generate/article-metadata` - Generate SEO metadata
- `POST /api/ai/generate/post-details` - Generate post caption and tags
- `POST /api/ai/generate/image` - Generate image from text
- `POST /api/ai/edit/image` - Edit existing image
- `POST /api/ai/generate/bulk` - Generate multiple pieces of content
- `POST /api/ai/search/knowledge` - Search knowledge base

## Database Schema

The application uses PostgreSQL with the following main entities:

- **Channels**: Publication platforms and configurations
- **Media Assets**: Image library with categorization
- **Articles**: Long-form content with SEO metadata
- **Posts**: Social media content with scheduling
- **Knowledge Sources**: Information sources for AI training
- **Knowledge Chunks**: Processed content with vector embeddings

See the `database/init.sql` file for the complete schema definition.

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # API endpoint handlers
├── middleware/      # Express middleware
├── models/          # TypeScript interfaces and types
├── routes/          # API route definitions
├── services/        # Business logic and external integrations
├── utils/           # Utility functions
└── database/        # Database migration and seeding
```

## Development

### Running Tests
```bash
bun test
```

### Code Quality
```bash
bun run build  # Type checking and bundling
```

### Database Operations
```bash
bun run db:migrate    # Run database migrations
bun run db:seed       # Seed sample data
```

## Health Check

The application provides a health check endpoint:
```
GET /health
```

## Logging

The application uses Winston for logging with:
- Console output in development
- File logging for errors and combined logs
- Configurable log levels

## Security Features

- JWT authentication for all API endpoints
- Input validation using Joi schemas
- SQL injection protection via parameterized queries
- CORS configuration
- Helmet.js for security headers
- Request payload size limits

## Vector Search

The application implements semantic search using:
- pgvector extension for PostgreSQL
- Google Gemini text embeddings
- HNSW indexing for fast similarity search
- Configurable similarity thresholds

## License

This project is proprietary and confidential.
