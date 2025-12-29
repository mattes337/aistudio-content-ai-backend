# AIService Implementation Plan

## Overview

Replace `AIService.ts`, `GeminiService.ts`, and `ClaudeAgentService.ts` with a single `AIService` using Vercel AI SDK (`@ai-sdk/google`) with Gemini 3 models and OpenNotebook as RAG tool.

## Requirements Summary

- **Models**: `gemini-3-flash` (fast) and `gemini-3-pro` (complex reasoning)
- **Framework**: Vercel AI SDK (`ai`, `@ai-sdk/google`)
- **RAG Integration**: OpenNotebookService as agent tools
- **Streaming**: Yes, for content generation endpoints
- **Embeddings**: Remove local embeddings - use OpenNotebook only
- **Claude Agent**: Remove entirely

## File Structure

```
src/services/ai-service/
  index.ts              # Main service export (static class)
  types.ts              # TypeScript types + Zod schemas
  models.ts             # Model config and selection
  errors.ts             # Custom error classes
  tools/
    openNotebook.ts     # RAG tool definitions (search, ask)
    index.ts            # Tool registry
  generators/
    content.ts          # Content generation (refine, article)
    metadata.ts         # Title, SEO, excerpt, post details
    image.ts            # Image generation and editing
  agent.ts              # Agent with tool loop
  streaming.ts          # Streaming utilities
```

## Dependencies to Add

```json
{
  "@ai-sdk/google": "^1.x.x",
  "ai": "^6.x.x",
  "zod": "^3.24.x"
}
```

## Dependencies to Remove (after migration)

- `@google/genai` - replaced by `@ai-sdk/google`
- `@anthropic-ai/claude-agent-sdk` - no longer needed

## Implementation Steps

### Step 1: Install Dependencies
```bash
bun add @ai-sdk/google ai zod
```

### Step 2: Create Type Definitions
**File**: `src/services/ai-service/types.ts`

Define Zod schemas for all structured outputs:
- `RefineContentResultSchema` - content + chatResponse
- `TitleSchema`, `SubjectSchema`, `ExcerptSchema`, `PreviewTextSchema`
- `MetadataSchema` - SEO fields + excerpt
- `PostDetailsSchema` - content, altText, tags
- `BulkContentSchema` - articles + posts arrays
- Agent types: `AgentQuery`, `AgentResponse`

### Step 3: Create Model Configuration
**File**: `src/services/ai-service/models.ts`

```typescript
export const MODELS = {
  FLASH: 'gemini-3-flash',
  PRO: 'gemini-3-pro',
} as const;

// Model selection by task complexity
const MODEL_CONFIGS = {
  refine: { model: MODELS.FLASH, temperature: 0.7 },
  title: { model: MODELS.FLASH, temperature: 0.8 },
  agent: { model: MODELS.PRO, thinkingLevel: 'medium' },
  // etc.
};
```

### Step 4: Create OpenNotebook Tools
**File**: `src/services/ai-service/tools/openNotebook.ts`

```typescript
import { tool } from 'ai';

export const searchKnowledgeTool = tool({
  description: 'Search knowledge base for relevant information',
  inputSchema: z.object({
    query: z.string(),
    type: z.enum(['text', 'vector']).optional(),
    limit: z.number().optional(),
  }),
  execute: async ({ query, type, limit }) => {
    return OpenNotebookService.search({ query, type, limit });
  },
});

export const askKnowledgeTool = tool({
  description: 'Ask question with RAG synthesis',
  inputSchema: z.object({ question: z.string() }),
  execute: async ({ question }) => {
    return OpenNotebookService.ask({ question });
  },
});
```

### Step 5: Implement Generator Methods

**File**: `src/services/ai-service/generators/content.ts`
- `refineContent(currentContent, instruction, type, history)` - with streaming
- `generateArticleContent(prompt, currentContent)` - with streaming

**File**: `src/services/ai-service/generators/metadata.ts`
- `generateTitle(content)` - returns `{ title }`
- `generateSubject(content)` - returns `{ subject }`
- `generateMetadata(content, title)` - returns `{ seo, excerpt }`
- `generateExcerpt(content)` - returns `{ excerpt }`
- `generatePreviewText(content)` - returns `{ previewText }`
- `generatePostDetails(prompt, currentCaption)` - returns `{ content, altText, tags }`
- `generateBulkContent(articleCount, postCount, knowledgeSummary)`
- `inferMetadata(content, type)` - orchestrates based on type

**File**: `src/services/ai-service/generators/image.ts`
- `generateImage(prompt, aspectRatio)` - returns `{ imageUrl, base64Image, mimeType }`
- `editImage(base64ImageData, mimeType, prompt)` - returns `{ imageUrl, base64Image }`

### Step 6: Implement Agent
**File**: `src/services/ai-service/agent.ts`

```typescript
import { generateText, stepCountIs } from 'ai';

export async function researchQuery(request: AgentQuery): Promise<AgentResponse> {
  // 1. Pre-fetch context from OpenNotebook
  // 2. Build system prompt with context
  // 3. Run generateText with tools
  // 4. Return response with sources and tool calls
}

export async function executeTask(task: AgentTask): Promise<Record<string, unknown>> {
  // Handle: create_article_draft, create_post_draft, create_media_draft
}
```

### Step 7: Create Main Service Export
**File**: `src/services/ai-service/index.ts`

```typescript
export class AIService {
  // Content generation
  static refineContent = refineContent;
  static refineContentStream = refineContentStream;  // NEW: streaming
  static generateArticleContent = generateArticleContent;

  // Metadata generation
  static generateTitle = generateTitle;
  static generateSubject = generateSubject;
  static generateMetadata = generateMetadata;
  static generateExcerpt = generateExcerpt;
  static generatePreviewText = generatePreviewText;
  static generatePostDetails = generatePostDetails;
  static generateBulkContent = generateBulkContent;
  static inferMetadata = inferMetadata;

  // Image generation
  static generateImage = generateImage;
  static editImage = editImage;

  // Agent/Research
  static researchQuery = researchQuery;
  static executeTask = executeTask;

  // Legacy compatibility
  static generateArticleTitle = async (content) => (await generateTitle(content)).title;
  static generateArticleMetadata = generateArticleMetadata;
  static generatePostDetailsLegacy = async (prompt, caption) => {
    const r = await generatePostDetails(prompt, caption || '');
    return { caption: r.content, altText: r.altText, tags: r.tags };
  };

  // Health check
  static healthCheck = healthCheck;
}
```

### Step 8: Add Streaming Endpoints
**File**: `src/services/ai-service/streaming.ts`

```typescript
import { streamText } from 'ai';

export async function* refineContentStream(...): AsyncGenerator<{
  type: 'delta' | 'done';
  content?: string;
  chatResponse?: string;
}> {
  const { textStream } = await streamText({...});
  for await (const chunk of textStream) {
    yield { type: 'delta', content: chunk };
  }
  yield { type: 'done', chatResponse: '...' };
}
```

### Step 9: Update AIController
**File**: `src/controllers/AIController.ts`

Changes:
1. Replace imports:
   ```typescript
   import { AIService } from '../services/ai-service';
   ```
2. Remove old AIService, GeminiService, ClaudeAgentService imports
3. Update method calls to use AIService
4. Add streaming endpoint for refineContent:
   ```typescript
   static async refineContentStream(req, res) {
     res.setHeader('Content-Type', 'text/event-stream');
     for await (const chunk of AIService.refineContentStream(...)) {
       res.write(`data: ${JSON.stringify(chunk)}\n\n`);
     }
     res.end();
   }
   ```
5. Remove `searchKnowledge` endpoint (uses removed embeddings)

### Step 10: Update Routes
**File**: `src/routes/ai.ts`

Add new streaming route:
```typescript
router.post('/refine-content/stream', AIController.refineContentStream);
```

Remove deprecated route:
```typescript
// Remove: router.post('/search/knowledge', ...)
```

### Step 11: Update Health Check
**File**: In AIController healthCheck method

```typescript
const [openNotebookHealthy, geminiHealthy] = await Promise.all([
  OpenNotebookService.healthCheck().catch(() => false),
  AIService.healthCheck().catch(() => false),
]);

res.json({
  status: 'ok',
  services: {
    gemini: geminiHealthy,
    open_notebook: openNotebookHealthy,
  },
});
```

### Step 12: Delete Old Services
After verification:
- Delete `src/services/AIService.ts`
- Delete `src/services/GeminiService.ts`
- Delete `src/services/ClaudeAgentService.ts`

### Step 13: Update Tests
- Create `tests/services/AIService.test.ts`
- Update `tests/controllers/AIController.test.ts`
- Delete old service tests

### Step 14: Remove Old Dependencies
```bash
bun remove @google/genai @anthropic-ai/claude-agent-sdk
```

## Files to Create

| File | Description |
|------|-------------|
| `src/services/ai-service/index.ts` | Main export |
| `src/services/ai-service/types.ts` | Types + Zod schemas |
| `src/services/ai-service/models.ts` | Model configuration |
| `src/services/ai-service/errors.ts` | Error classes |
| `src/services/ai-service/streaming.ts` | Streaming utilities |
| `src/services/ai-service/tools/openNotebook.ts` | RAG tools |
| `src/services/ai-service/tools/index.ts` | Tool registry |
| `src/services/ai-service/generators/content.ts` | Content generation |
| `src/services/ai-service/generators/metadata.ts` | Metadata generation |
| `src/services/ai-service/generators/image.ts` | Image generation |
| `src/services/ai-service/agent.ts` | Agent implementation |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add/remove dependencies |
| `src/controllers/AIController.ts` | Update imports, add streaming endpoint |
| `src/routes/ai.ts` | Add streaming route, remove deprecated |

## Files to Delete

| File | Reason |
|------|--------|
| `src/services/AIService.ts` | Replaced by ai-service/ |
| `src/services/GeminiService.ts` | Replaced by ai-service/ |
| `src/services/ClaudeAgentService.ts` | Removed per requirements |

## Method Mapping (Backwards Compatibility)

| Old Service | Old Method | New Method |
|-------------|------------|------------|
| AIService (old) | generateArticleContent | AIService.generateArticleContent |
| AIService (old) | generateArticleTitle | AIService.generateArticleTitle |
| AIService (old) | generateArticleMetadata | AIService.generateArticleMetadata |
| AIService (old) | generatePostDetails | AIService.generatePostDetailsLegacy |
| AIService (old) | generateImage | AIService.generateImage |
| AIService (old) | editImage | AIService.editImage |
| AIService (old) | generateBulkContent | AIService.generateBulkContent |
| AIService (old) | getEmbedding | REMOVED |
| AIService (old) | searchSimilarContent | REMOVED |
| GeminiService | refineContent | AIService.refineContent |
| GeminiService | generateTitle | AIService.generateTitle |
| GeminiService | generateSubject | AIService.generateSubject |
| GeminiService | generateMetadata | AIService.generateMetadata |
| GeminiService | generateExcerpt | AIService.generateExcerpt |
| GeminiService | generatePreviewText | AIService.generatePreviewText |
| GeminiService | generatePostDetails | AIService.generatePostDetails |
| GeminiService | generateImage | AIService.generateImage |
| GeminiService | editImage | AIService.editImage |
| GeminiService | inferMetadata | AIService.inferMetadata |
| ClaudeAgentService | researchQuery | AIService.researchQuery |
| ClaudeAgentService | executeTask | AIService.executeTask |

## Testing Strategy

1. **Unit Tests**: Test each generator method with mocked AI SDK
2. **Tool Tests**: Test OpenNotebook tools with mocked service
3. **Agent Tests**: Test agent with mocked tools
4. **Integration Tests**: Test controller endpoints end-to-end
5. **Streaming Tests**: Test SSE streaming behavior

## Risk Mitigation

1. **Model Availability**: Verify `gemini-3-flash` and `gemini-3-pro` are available in Vercel AI SDK
2. **Image Generation**: Test image generation API compatibility
3. **Backwards Compatibility**: Run existing tests before removing old services
4. **Streaming**: Ensure frontend can handle SSE responses
