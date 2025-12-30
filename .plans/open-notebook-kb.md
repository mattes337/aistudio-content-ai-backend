# Open Notebook as Knowledge Base - Evaluation Plan

## Goal
Evaluate two approaches to using Open Notebook for **improved AI response quality**:
- **Option A (Tool)**: Gemini executes AI, Open Notebook provides context
- **Option B (Delegation)**: Open Notebook handles both context AND AI execution

## Expected Outcome
**Option A is expected to be better** for most use cases because:
- Full control over prompts, temperature, structured output schemas
- Streaming support for real-time responses
- Can combine multiple tools (search + ask + web search)
- Gemini 2.5 Pro/Flash optimized for specific content types

**Option B may be better** when:
- Open Notebook has specialized models/fine-tuning for the knowledge domain
- Simpler integration is more important than fine-grained control
- Context window management is handled better by Open Notebook

## Implementation Approach

### Phase 1: Configuration & Routing Layer

**New config in `src/utils/env.ts`:**
```typescript
aiExecutionMode: 'local' | 'opennotebook' | 'hybrid';
openNotebookNotebookId: string;  // Required for Option B
```

**Create `src/services/ai-service/router.ts`:**
- Routes AI requests based on config
- Logs which approach was used for comparison

### Phase 2: Option B Implementation (Delegation)

**Create `src/services/ai-service/adapters/openNotebookAdapter.ts`:**

Map all AI endpoints to Open Notebook:

| Current Endpoint | Open Notebook Mapping |
|------------------|----------------------|
| `researchQuery()` | `ask()` - Direct Q&A with RAG |
| `refineContent()` | `executeChat()` - Multi-turn with session |
| `generateTitle()` | `ask()` - Simple prompt |
| `generateSubject()` | `ask()` - Simple prompt |
| `generateMetadata()` | `ask()` with JSON parsing |
| `generateExcerpt()` | `ask()` - Simple prompt |
| `generatePostDetails()` | `ask()` with JSON parsing |

**Note:** Image generation stays local (Gemini Imagen API).

### Phase 3: Enhanced Option A (Tool Approach)

**Enhance `src/services/ai-service/agent.ts`:**
- Multi-stage context retrieval (vector + text + ask synthesis)
- Better source ranking and deduplication
- Configurable context depth (minimal/enhanced/full)

**Add to tools:**
- `chatWithContextTool` - Use Open Notebook's executeChat for follow-ups

### Phase 4: Quality Comparison

**Add logging to both approaches:**
```typescript
interface AIExecutionLog {
  requestId: string;
  approach: 'local' | 'opennotebook';
  endpoint: string;
  latencyMs: number;
  sourceCount?: number;
  responseLength: number;
  error?: string;
}
```

**Manual comparison criteria:**
- Response relevance to query
- Source citation accuracy
- Content coherence and formatting
- Factual accuracy against knowledge base

---

## Files to Create/Modify

### New Files
1. `src/services/ai-service/router.ts` - Execution mode routing
2. `src/services/ai-service/adapters/openNotebookAdapter.ts` - Option B implementations
3. `src/services/ai-service/logging.ts` - Comparison logging

### Modified Files
1. `src/utils/env.ts` - Add aiExecutionMode, openNotebookNotebookId
2. `src/services/ai-service/index.ts` - Use router for method dispatch
3. `src/services/ai-service/agent.ts` - Enhanced context retrieval for Option A
4. `src/services/OpenNotebookService.ts` - Add streaming chat support if available

---

## Implementation Order

1. **Add config options** (env.ts)
2. **Create router** (router.ts)
3. **Implement adapters** (openNotebookAdapter.ts)
4. **Add logging** (logging.ts)
5. **Wire up AIService** (index.ts)
6. **Enhance Option A** (agent.ts)
7. **Test both approaches**

---

## Open Questions for Testing

1. Does Open Notebook's `executeChat` support streaming?
2. What model does Open Notebook use internally?
3. How does Open Notebook's `ask()` handle structured output requests?
4. What's the latency difference for complex queries?

## Success Criteria

- Both approaches work for all AI endpoints
- Config toggle switches cleanly between them
- Logging captures metrics for comparison
- Quality evaluation shows which approach produces better results
