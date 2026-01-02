# AI Services Documentation

This document provides a comprehensive guide to the AI services implemented in the Content AI Backend.

## Overview

The AI services layer provides a unified, workflow-based architecture for AI-powered content creation:

1. **Workflow Architecture** - Pluggable workflow system for all AI operations
2. **Gemini Integration** - Google's generative AI for content and image generation
3. **Research Workflows** - RAG-enhanced research with optional webhook delegation
4. **Open Notebook** - Knowledge base integration for context-aware generation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       API Layer (REST)                      │
│                    AIController Endpoints                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        AIService                            │
│              (Static methods, backwards compatible)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Registry                        │
│         (Routes to available workflow implementations)      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Research    │    │   Metadata    │    │   Content     │
│   Workflows   │    │   Workflows   │    │   Workflows   │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Builtin     │    │ • Builtin     │    │ • Builtin     │
│ • Webhook     │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
├──────────────────┬──────────────────┬──────────────────────┤
│  Gemini API      │  Open Notebook   │  Webhook Services    │
│  (Google)        │  (RAG/KB)        │  (Optional)          │
└──────────────────┴──────────────────┴──────────────────────┘
```

## Workflow Types

The system supports six workflow categories:

| Type | Purpose | Default Implementation |
|------|---------|----------------------|
| `research` | Research queries with RAG | BuiltinResearchWorkflow (or WebhookResearchWorkflow if configured) |
| `metadata` | Title, SEO, excerpt generation | BuiltinMetadataWorkflow |
| `content` | Content creation and refinement | BuiltinContentWorkflow |
| `image` | Image generation and editing | BuiltinImageWorkflow |
| `bulk` | Bulk content generation | BuiltinBulkWorkflow |
| `task` | Structured task execution | BuiltinTaskWorkflow |

## Configuration

### Environment Variables

```bash
# Required - AI Provider Keys
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio

# Optional - Research Webhook
# When configured, research requests forward to this webhook instead of builtin workflow
RESEARCH_WEBHOOK_URL=https://your-research-service.example.com/api/research

# Optional - Knowledge Base
OPEN_NOTEBOOK_URL=http://localhost:5055
OPEN_NOTEBOOK_PASSWORD=your-password
OPEN_NOTEBOOK_ENABLED=true

# Optional - AI Model Configuration
# Base model names (override defaults)
AI_MODEL_FLASH=gemini-2.5-flash
AI_MODEL_PRO=gemini-2.5-pro

# Task-specific model overrides
AI_MODEL_RESEARCH=gemini-2.5-pro      # Research/RAG queries
AI_MODEL_AGENT=gemini-2.5-pro         # Multi-step agent tasks
AI_MODEL_REFINE=gemini-2.5-flash      # Content refinement
AI_MODEL_METADATA=gemini-2.5-flash    # Title, subject, excerpt, SEO
AI_MODEL_IMAGE=gemini-2.5-flash       # Image generation
AI_MODEL_BULK=gemini-2.5-pro          # Bulk content generation
```

### Model Configuration

Models are configured centrally and can be overridden at multiple levels:

1. **Base Models**: `AI_MODEL_FLASH` and `AI_MODEL_PRO` set the default models
2. **Task Overrides**: Specific tasks can use different models via `AI_MODEL_*` variables
3. **Runtime**: Some endpoints accept model parameters for per-request customization

## REST API Endpoints

### Unified Metadata Generation

#### POST `/api/ai/metadata`

Generate specific metadata based on requested operations. This is the recommended endpoint for metadata generation.

**Request**:
```json
{
  "operations": ["title", "excerpt", "seoMetadata"],
  "content": "Your article content here...",
  "contentType": "article",
  "title": "Required for seoMetadata operation"
}
```

**Available Operations**:
- `title` - Generate article title
- `subject` - Generate newsletter subject line
- `excerpt` - Generate content excerpt/summary
- `seoMetadata` - Generate SEO metadata (requires `title` parameter)
- `previewText` - Generate email preview text
- `postDetails` - Generate social post details (caption, altText, tags)

**Response** (only requested operations are returned):
```json
{
  "title": { "title": "Generated Title" },
  "excerpt": { "excerpt": "Short summary..." },
  "seoMetadata": {
    "seo": {
      "title": "SEO Title",
      "description": "Meta description",
      "keywords": "keyword1, keyword2",
      "slug": "generated-slug"
    },
    "excerpt": "Another excerpt"
  }
}
```

### Image Generation

#### POST `/api/ai/generate/image-v2`

Generate an image with optional type and bounds.

**Request**:
```json
{
  "prompt": "A futuristic cityscape at sunset",
  "imageType": "photo",
  "bounds": {
    "width": 1920,
    "height": 1080,
    "aspectRatio": "16:9"
  }
}
```

**Image Types**: `photo`, `illustration`, `icon`, `diagram`, `art`, `other`

**Response**:
```json
{
  "imageUrl": "data:image/png;base64,...",
  "base64Image": "base64-encoded-data",
  "mimeType": "image/png"
}
```

#### POST `/api/ai/edit/image-v2`

Edit an existing image with optional type and bounds.

**Request**:
```json
{
  "base64ImageData": "base64-encoded-image",
  "mimeType": "image/jpeg",
  "prompt": "Add a blue sky background",
  "imageType": "photo",
  "bounds": {
    "aspectRatio": "16:9"
  }
}
```

### Content Refinement

#### POST `/api/ai/refine-content`

Refine content iteratively with AI assistance.

**Request**:
```json
{
  "currentContent": "My article draft...",
  "instruction": "Make it more engaging",
  "type": "article",
  "history": [
    { "role": "user", "text": "Write about AI" },
    { "role": "assistant", "text": "I created a draft" }
  ]
}
```

**Content Types**: `article`, `post`, `newsletter`

**Response**:
```json
{
  "content": "Refined article content...",
  "chatResponse": "I made it more engaging by adding hooks!"
}
```

#### POST `/api/ai/refine-content/stream`

Same as above but returns Server-Sent Events for streaming.

### Research Endpoints

#### POST `/api/ai/research`

Perform research query with RAG support.

**Request**:
```json
{
  "query": "What are best practices for content SEO?",
  "channelId": "optional-channel-id",
  "history": []
}
```

**Response**:
```json
{
  "response": "Based on current best practices...",
  "sources": [
    {
      "name": "SEO Guide 2024",
      "content": "Relevant excerpt...",
      "url": "https://example.com/source"
    }
  ]
}
```

#### POST `/api/ai/research/stream`

Streaming research with verbose output option.

**Request**:
```json
{
  "query": "Research query...",
  "verbose": true,
  "searchWeb": true
}
```

**SSE Events**:
```
data: {"type":"status","status":"Searching knowledge base..."}
data: {"type":"tool_start","tool":"searchKnowledge","toolInput":{...}}
data: {"type":"tool_result","tool":"searchKnowledge","toolResult":{...}}
data: {"type":"delta","content":"Partial response..."}
data: {"type":"sources","sources":[...]}
data: {"type":"done","response":"Complete response","steps":3}
```

### Knowledge Base Endpoints

#### POST `/api/ai/knowledge/search`

Search the Open Notebook knowledge base.

**Request**:
```json
{
  "query": "brand guidelines",
  "type": "vector",
  "limit": 10,
  "minimum_score": 0.3
}
```

#### POST `/api/ai/knowledge/ask`

Ask a question with RAG-enhanced answer.

**Request**:
```json
{
  "question": "What are our social media posting guidelines?"
}
```

### Health Check

#### GET `/api/ai/health`

Check all AI services status.

**Response**:
```json
{
  "status": "ok",
  "services": {
    "gemini": true,
    "open_notebook": true
  }
}
```

## Usage Examples

### Generate Multiple Metadata Fields

```typescript
// Request title, excerpt, and SEO metadata in one call
const response = await fetch('/api/ai/metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operations: ['title', 'excerpt', 'seoMetadata'],
    content: articleContent,
    contentType: 'article',
    title: 'My Article Title' // Required for seoMetadata
  })
});

const { title, excerpt, seoMetadata } = await response.json();
```

### Generate Image with Specific Style

```typescript
const response = await fetch('/api/ai/generate/image-v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A minimalist logo for a tech startup',
    imageType: 'icon',
    bounds: { aspectRatio: '1:1' }
  })
});

const { imageUrl, base64Image, mimeType } = await response.json();
```

### Iterative Content Refinement

```typescript
// Initial creation
const initial = await refineContent('', 'Write an article about AI trends', 'article', []);

// First refinement with history
const refined = await refineContent(
  initial.content,
  'Add more technical details',
  'article',
  [
    { role: 'user', text: 'Write an article about AI trends' },
    { role: 'assistant', text: initial.chatResponse }
  ]
);
```

### Research with Streaming

```typescript
const eventSource = new EventSource('/api/ai/research/stream');

// Or using fetch for POST with body
const response = await fetch('/api/ai/research/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What are the latest AI trends?',
    verbose: true,
    searchWeb: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log(event.type, event);
    }
  }
}
```

## Workflow Customization

### Research Webhook

Configure an external research service:

```bash
RESEARCH_WEBHOOK_URL=https://your-service.com/api/research
```

The webhook receives POST requests with:
```json
{
  "query": "Research query",
  "channelId": "optional",
  "history": [],
  "notebookId": "optional",
  "verbose": false,
  "searchWeb": false
}
```

And should return SSE streams for streaming endpoints.

### Custom Model Selection

Override models for specific use cases:

```bash
# Use a preview model for research
AI_MODEL_RESEARCH=gemini-2.5-pro-preview

# Use experimental model for images
AI_MODEL_IMAGE=gemini-2.0-flash-exp
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "validOperations": ["title", "subject", "..."]  // When applicable
}
```

Common HTTP status codes:
- `400` - Invalid request (missing required fields, invalid operations)
- `401` - Authentication required
- `500` - Internal server error

## Performance Considerations

### Typical Response Times

| Operation | Time |
|-----------|------|
| Title generation | 1-2s |
| Metadata (single) | 1-3s |
| Metadata (multiple) | 2-5s (parallel) |
| Content refinement | 2-5s |
| Image generation | 10-30s |
| Research query | 5-15s |
| Research stream | First chunk ~2s |

### Optimization Tips

1. **Batch Operations**: Use `/api/ai/metadata` with multiple operations
2. **Streaming**: Use streaming endpoints for better UX
3. **Caching**: Cache generated metadata for static content
4. **Content Length**: Truncate long content to first 2000-3000 characters

## Security

1. **Authentication**: All endpoints require JWT token
2. **API Keys**: Never expose in client code
3. **Input Validation**: All inputs validated with Joi schemas
4. **Rate Limiting**: Implement rate limiting in production

## Changelog

### v2.1.0 (Current)
- Removed individual metadata endpoints (use unified `/api/ai/metadata` instead)
- Simplified API surface for metadata generation

### v2.0.0
- Workflow-based architecture
- Unified metadata endpoint with operations array
- Configurable AI models via environment variables
- Image generation with type and bounds parameters
- Research webhook support for external services
- Streaming support for research and content

### v1.0.0
- Initial implementation with GeminiService
- Claude Agent SDK integration
- Open Notebook RAG integration
