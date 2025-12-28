# AI Services Documentation

This document provides a comprehensive guide to the AI services implemented in the Content AI Backend.

## Overview

The AI services layer integrates three major AI capabilities:
1. **Gemini API** - Google's generative AI for content creation and image generation
2. **Claude Agent SDK** - Anthropic's agent framework for research and complex tasks
3. **Open Notebook** - RAG (Retrieval-Augmented Generation) knowledge base integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       API Layer (REST)                      │
│                    AIController Endpoints                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  GeminiService   │ ClaudeAgentService│ OpenNotebookService│
│  - Content Gen   │  - Research      │  - RAG Search       │
│  - Image Gen     │  - Task Execution│  - Knowledge Query  │
│  - Metadata Gen  │  - Web Tools     │  - Chat Sessions    │
└──────────────────┴──────────────────┴──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External AI Services                     │
├──────────────────┬──────────────────┬──────────────────────┤
│  Gemini API      │  Anthropic API   │  Open Notebook API  │
│  (Google)        │  (Claude)        │  (Local/Remote)     │
└──────────────────┴──────────────────┴──────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional (defaults shown)
OPEN_NOTEBOOK_URL=http://localhost:5055
```

### Getting API Keys

1. **Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to `.env` file

2. **Anthropic API Key**:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Generate an API key
   - Add to `.env` file

3. **Open Notebook**:
   - Deploy Open Notebook service (see deployment docs)
   - Update `OPEN_NOTEBOOK_URL` if not using default

## Service Details

### 1. GeminiService

The GeminiService provides content generation, refinement, and image creation capabilities using Google's Gemini API.

#### Key Features

- **Structured Output**: All methods use JSON schema validation for reliable, type-safe responses
- **Multi-modal Support**: Both text and image generation
- **Content Refinement**: Iterative content improvement with conversation history
- **Metadata Generation**: SEO optimization and content metadata

#### Available Methods

##### Content Refinement

```typescript
GeminiService.refineContent(
  currentContent: string,
  instruction: string,
  type: 'article' | 'post' | 'newsletter',
  history?: ChatMessage[]
): Promise<RefineContentResult>
```

**Use Case**: Interactive content editing with AI assistance

**Example**:
```typescript
const result = await GeminiService.refineContent(
  "My blog post draft...",
  "Make it more engaging and add a hook at the beginning",
  "article",
  [
    { role: "user", text: "Write about AI" },
    { role: "assistant", text: "I created an initial draft" }
  ]
);
// Returns: { content: "Updated content...", chatResponse: "I added an engaging hook!" }
```

##### Title Generation

```typescript
GeminiService.generateTitle(content: string): Promise<{ title: string }>
```

**Use Case**: Generate SEO-optimized titles from article content

##### Subject Line Generation

```typescript
GeminiService.generateSubject(content: string): Promise<{ subject: string }>
```

**Use Case**: Create compelling email subject lines for newsletters

##### Metadata Generation

```typescript
GeminiService.generateMetadata(
  content: string,
  title: string
): Promise<{
  seo: { title: string; description: string; keywords: string; slug: string };
  excerpt: string;
}>
```

**Use Case**: Complete SEO metadata generation for articles

##### Post Details Generation

```typescript
GeminiService.generatePostDetails(
  prompt: string,
  currentCaption: string
): Promise<{ content: string; altText: string; tags: string[] }>
```

**Use Case**: Generate social media post captions, alt text, and hashtags

##### Image Generation

```typescript
GeminiService.generateImage(
  prompt: string,
  aspectRatio?: string
): Promise<{ imageUrl: string; base64Image: string; mimeType: string }>
```

**Use Case**: Create images from text descriptions

**Supported Aspect Ratios**: `1:1`, `16:9`, `9:16`

##### Image Editing

```typescript
GeminiService.editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<{ imageUrl: string; base64Image: string }>
```

**Use Case**: Modify existing images with natural language instructions

##### Smart Metadata Inference

```typescript
GeminiService.inferMetadata(
  content: string,
  type: 'article' | 'post' | 'newsletter'
): Promise<any>
```

**Use Case**: Automatically generate appropriate metadata based on content type

#### Models Used

- **Text Generation**: `gemini-2.5-flash-preview-05-20` - Fast, efficient content generation
- **Image Generation**: `gemini-2.0-flash-exp` - Experimental image generation capabilities

### 2. ClaudeAgentService

The ClaudeAgentService provides advanced research capabilities and task execution using Anthropic's Claude Agent SDK with tool access.

#### Key Features

- **RAG Integration**: Automatically searches Open Notebook knowledge base
- **Tool Access**: Can use Read, Glob, Grep, WebSearch, and WebFetch tools
- **Source Citation**: Returns sources used in research
- **Task Execution**: Autonomous content creation tasks

#### Available Methods

##### Research Query

```typescript
ClaudeAgentService.researchQuery(request: ResearchQuery): Promise<ResearchResponse>
```

**Request Interface**:
```typescript
interface ResearchQuery {
  query: string;           // The research question
  channelId?: string;      // Optional channel context
  history?: ChatMessage[]; // Conversation history
  notebookId?: string;     // Knowledge base notebook ID
}
```

**Response Interface**:
```typescript
interface ResearchResponse {
  response: string;                              // AI-generated answer
  sources?: { name: string; content: string }[]; // Knowledge base sources
  toolCalls?: { name: string; result: any }[];   // Tools used
}
```

**Use Case**: In-depth research with knowledge base augmentation

**Example**:
```typescript
const result = await ClaudeAgentService.researchQuery({
  query: "What are the latest trends in AI content creation?",
  notebookId: "my-knowledge-base",
  history: []
});
// Returns research answer with cited sources
```

**How It Works**:
1. Searches Open Notebook for relevant context (vector search)
2. Constructs prompt with retrieved sources
3. Claude Agent processes with tool access
4. Returns answer with source citations

##### Task Execution

```typescript
ClaudeAgentService.executeTask(task: AgentTask): Promise<Record<string, any>>
```

**Task Types**:
- `create_article_draft` - Generate complete article
- `create_post_draft` - Generate social media post
- `create_media_draft` - Generate image prompt

**Example**:
```typescript
const result = await ClaudeAgentService.executeTask({
  type: "create_article_draft",
  params: {
    title: "The Future of AI",
    topic: "Artificial Intelligence advancements",
    guidelines: "Professional, informative, 800 words"
  }
});
```

##### Health Check

```typescript
ClaudeAgentService.healthCheck(): Promise<boolean>
```

**Use Case**: Verify Claude Agent SDK is functioning

### 3. OpenNotebookService

The OpenNotebookService provides RAG (Retrieval-Augmented Generation) capabilities through integration with the Open Notebook knowledge base system.

#### Key Features

- **Vector Search**: Semantic search across knowledge base
- **Text Search**: Keyword-based search
- **Q&A System**: Ask questions with RAG-enhanced answers
- **Chat Sessions**: Maintain conversation context
- **Context Building**: Generate context for prompts

#### Available Methods

##### Search Knowledge Base

```typescript
OpenNotebookService.search(request: SearchRequest): Promise<SearchResponse>
```

**Request Interface**:
```typescript
interface SearchRequest {
  query: string;
  type?: 'text' | 'vector';     // Search type
  limit?: number;                // Max results (default: 100)
  search_sources?: boolean;      // Search source documents
  search_notes?: boolean;        // Search note chunks
  minimum_score?: number;        // Relevance threshold (0-1)
}
```

**Use Case**: Find relevant information in knowledge base

**Example**:
```typescript
const results = await OpenNotebookService.search({
  query: "content marketing strategies",
  type: "vector",
  limit: 10,
  minimum_score: 0.3
});
```

##### Ask Question (RAG)

```typescript
OpenNotebookService.ask(request: AskRequest): Promise<AskResponse>
```

**Request Interface**:
```typescript
interface AskRequest {
  question: string;
  strategy_model?: string;      // Model for query strategy
  answer_model?: string;         // Model for answering
  final_answer_model?: string;   // Model for synthesis
}
```

**Use Case**: Get AI-generated answers based on knowledge base

**Example**:
```typescript
const answer = await OpenNotebookService.ask({
  question: "What are our brand guidelines for social media?"
});
// Returns answer based on stored knowledge
```

##### Chat Sessions

```typescript
// Get all sessions
OpenNotebookService.getChatSessions(notebookId: string): Promise<ChatSession[]>

// Create new session
OpenNotebookService.createChatSession(
  notebookId: string,
  title?: string,
  modelOverride?: string
): Promise<ChatSession>

// Execute chat
OpenNotebookService.executeChat(request: ExecuteChatRequest): Promise<ExecuteChatResponse>
```

**Use Case**: Maintain stateful conversations with knowledge base context

##### Build Context

```typescript
OpenNotebookService.buildContext(
  notebookId: string,
  contextConfig?: Record<string, any>
): Promise<{ context: Record<string, any>; token_count: number; char_count: number }>
```

**Use Case**: Generate context for custom prompts

##### Health Check

```typescript
OpenNotebookService.healthCheck(): Promise<boolean>
```

**Use Case**: Verify Open Notebook service is accessible

## REST API Endpoints

### Content Refinement (Gemini)

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

**Response**:
```json
{
  "content": "Refined article content...",
  "chatResponse": "I made it more engaging by adding hooks!"
}
```

### Generation Endpoints (Gemini)

#### POST `/api/ai/generate/title`
Generate article title from content.

#### POST `/api/ai/generate/subject`
Generate newsletter subject line.

#### POST `/api/ai/generate/metadata`
Generate SEO metadata and excerpt.

**Request**:
```json
{
  "content": "Article content...",
  "title": "Article Title"
}
```

**Response**:
```json
{
  "seo": {
    "title": "SEO-optimized title",
    "description": "Meta description...",
    "keywords": "keyword1, keyword2, keyword3",
    "slug": "article-title"
  },
  "excerpt": "Short summary..."
}
```

#### POST `/api/ai/generate/excerpt`
Generate excerpt from content.

#### POST `/api/ai/generate/preview-text`
Generate email preview text.

#### POST `/api/ai/generate/post-details-v2`
Generate social media post content.

**Request**:
```json
{
  "prompt": "Create a post about our new product launch",
  "currentCaption": "Check out our new product!"
}
```

**Response**:
```json
{
  "content": "🚀 Exciting news! Our new product...",
  "altText": "Product launch announcement image",
  "tags": ["#ProductLaunch", "#Innovation", "#Tech"]
}
```

#### POST `/api/ai/generate/image-v2`
Generate image from text prompt.

**Request**:
```json
{
  "prompt": "A futuristic cityscape at sunset",
  "aspectRatio": "16:9"
}
```

**Response**:
```json
{
  "imageUrl": "data:image/png;base64,...",
  "base64Image": "base64-encoded-data",
  "mimeType": "image/png"
}
```

#### POST `/api/ai/edit/image-v2`
Edit existing image.

**Request**:
```json
{
  "base64ImageData": "base64-encoded-image",
  "mimeType": "image/jpeg",
  "prompt": "Add a blue sky background"
}
```

#### POST `/api/ai/infer-metadata`
Automatically infer metadata based on content type.

**Request**:
```json
{
  "content": "Content text...",
  "type": "article"
}
```

### Research Endpoints (Claude Agent)

#### POST `/api/ai/research`

Perform research query with RAG support.

**Request**:
```json
{
  "query": "What are best practices for content SEO?",
  "notebookId": "knowledge-base-id",
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
      "content": "Relevant excerpt..."
    }
  ],
  "toolCalls": [
    {
      "name": "WebSearch",
      "result": "..."
    }
  ]
}
```

#### POST `/api/ai/agent/task`

Execute content creation task.

**Request**:
```json
{
  "type": "create_article_draft",
  "params": {
    "title": "The Future of AI",
    "topic": "AI advancements in 2024",
    "guidelines": "Professional, 800 words"
  }
}
```

**Response**:
```json
{
  "type": "create_article_draft",
  "result": "Complete article content..."
}
```

### Knowledge Base Endpoints (Open Notebook)

#### POST `/api/ai/knowledge/search`

Search knowledge base.

**Request**:
```json
{
  "query": "brand guidelines",
  "type": "vector",
  "limit": 10,
  "minimum_score": 0.3
}
```

**Response**:
```json
{
  "results": [
    {
      "id": "chunk-123",
      "content": "Our brand uses blue as primary color...",
      "source_name": "Brand Guidelines.pdf",
      "score": 0.87
    }
  ],
  "total_count": 5,
  "search_type": "vector"
}
```

#### POST `/api/ai/knowledge/ask`

Ask question to knowledge base.

**Request**:
```json
{
  "question": "What are our social media posting guidelines?"
}
```

**Response**:
```json
{
  "answer": "Based on your guidelines, posts should be...",
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
    "claude_agent": true,
    "open_notebook": false
  }
}
```

## Best Practices

### 1. Content Refinement Workflow

For iterative content creation:

```typescript
// Initial creation
const initial = await GeminiService.refineContent(
  "",
  "Write an article about AI trends",
  "article",
  []
);

// First refinement
const refined1 = await GeminiService.refineContent(
  initial.content,
  "Add more technical details",
  "article",
  [
    { role: "user", text: "Write an article about AI trends" },
    { role: "assistant", text: initial.chatResponse }
  ]
);

// Final polish
const final = await GeminiService.refineContent(
  refined1.content,
  "Make the intro more engaging",
  "article",
  [
    { role: "user", text: "Write an article about AI trends" },
    { role: "assistant", text: initial.chatResponse },
    { role: "user", text: "Add more technical details" },
    { role: "assistant", text: refined1.chatResponse }
  ]
);
```

### 2. Research + Generation Workflow

Combine research and content generation:

```typescript
// Step 1: Research the topic
const research = await ClaudeAgentService.researchQuery({
  query: "Latest AI content creation trends 2024",
  notebookId: "knowledge-base"
});

// Step 2: Generate content based on research
const content = await GeminiService.refineContent(
  "",
  `Write an article about: ${research.response}`,
  "article"
);

// Step 3: Generate metadata
const metadata = await GeminiService.generateMetadata(
  content.content,
  "AI Content Creation Trends 2024"
);
```

### 3. Knowledge-Enhanced Generation

Use Open Notebook for context-aware generation:

```typescript
// Search knowledge base
const knowledge = await OpenNotebookService.search({
  query: "brand voice and tone",
  type: "vector",
  limit: 3
});

// Use in content generation
const context = knowledge.results
  .map(r => r.content)
  .join("\n");

const content = await GeminiService.refineContent(
  "",
  `Write a social media post following this brand voice: ${context}`,
  "post"
);
```

### 4. Error Handling

Always implement proper error handling:

```typescript
try {
  const result = await GeminiService.refineContent(
    content,
    instruction,
    type
  );
  // Handle success
} catch (error) {
  if (error.message.includes("API key")) {
    // Handle authentication error
  } else if (error.message.includes("quota")) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

### 5. Rate Limiting Awareness

- Gemini API: Has rate limits per minute/day
- Claude Agent SDK: Respects Anthropic API limits
- Open Notebook: Depends on deployment configuration

Implement retry logic and backoff strategies for production use.

## Troubleshooting

### Common Issues

#### 1. "Gemini API key not configured"

**Solution**: Ensure `GEMINI_API_KEY` is set in `.env` file

#### 2. "Open Notebook service unavailable"

**Solution**:
- Check Open Notebook is running: `curl http://localhost:5055/docs`
- Verify `OPEN_NOTEBOOK_URL` in `.env`
- Check network connectivity

#### 3. "Claude Agent health check failed"

**Solution**:
- Verify `ANTHROPIC_API_KEY` is valid
- Check API quota/rate limits
- Review network/firewall settings

#### 4. "JSON parse error in Gemini response"

**Solution**: The `cleanJson` helper should handle this, but if it persists:
- Check model version compatibility
- Verify response schema definitions
- Enable debug logging to see raw responses

### Debug Mode

Enable detailed logging:

```typescript
// In src/utils/env.ts
export const loadEnvConfig = (): AppConfig => {
  return {
    // ...
    logLevel: 'debug', // Change from 'info' to 'debug'
  };
};
```

View logs for debugging:
```bash
# Development
tail -f logs/combined.log

# Production
docker-compose logs -f app
```

## Testing

Run the test suite:

```bash
# All tests
npm test

# Specific service
npm test -- GeminiService

# With coverage
npm run test:coverage
```

Test files are located in `/tests/services/`:
- `GeminiService.test.ts`
- `ClaudeAgentService.test.ts`
- `OpenNotebookService.test.ts`

## Migration from Legacy AIService

If you have existing code using the legacy `AIService`, here's how to migrate:

### Old Code (AIService)
```typescript
const content = await AIService.generateArticleContent(prompt);
const title = await AIService.generateArticleTitle(content);
```

### New Code (GeminiService)
```typescript
const result = await GeminiService.refineContent(
  "",
  prompt,
  "article"
);
const { title } = await GeminiService.generateTitle(result.content);
```

The legacy endpoints are still available for backwards compatibility but are deprecated.

## Performance Considerations

### Latency

Typical response times:
- **GeminiService.refineContent**: 2-5 seconds
- **GeminiService.generateImage**: 10-30 seconds
- **ClaudeAgentService.researchQuery**: 5-15 seconds (with RAG)
- **OpenNotebookService.search**: <1 second

### Optimization Tips

1. **Batch Operations**: Use `Promise.all()` for independent operations
2. **Caching**: Cache metadata and titles for frequently accessed content
3. **Streaming**: For real-time UX, consider implementing streaming responses
4. **Content Length**: Limit content length in prompts (use excerpts for long content)

## Security Considerations

1. **API Keys**: Never expose API keys in client-side code
2. **Input Validation**: All endpoints use Joi validation schemas
3. **Rate Limiting**: Implement rate limiting in production
4. **Content Filtering**: Consider content moderation for user-generated prompts
5. **Authentication**: All endpoints require JWT authentication

## Future Enhancements

Planned features:
- [ ] Streaming responses for real-time UX
- [ ] Advanced caching layer
- [ ] Custom fine-tuned models
- [ ] Multi-modal knowledge base (images + text)
- [ ] A/B testing for generated content
- [ ] Content quality scoring
- [ ] Automated content approval workflows

## Support

For issues or questions:
1. Check this documentation
2. Review test files for usage examples
3. Check service health: `GET /api/ai/health`
4. Enable debug logging
5. Contact the development team

## Changelog

### v1.0.0 (Current)
- Initial implementation of GeminiService with structured outputs
- Claude Agent SDK integration with RAG support
- Open Notebook integration for knowledge base
- Comprehensive REST API endpoints
- Full test coverage
- Complete API documentation
