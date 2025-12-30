# Open Notebook as Knowledge Base - Enhanced Tool Integration

## Goal
Improve AI response quality by enhancing Open Notebook integration as a **multi-stage retrieval tool** for the AI agent.

## Current State
- `OpenNotebookService` provides: `search()`, `ask()`, `executeChat()`, `buildContext()`
- Agent does single vector search before generation
- Two tools available: `searchKnowledgeTool`, `askKnowledgeTool`

## Target Architecture
**Agent-driven multi-stage retrieval** where the agent decides:
1. What to search for (iteratively)
2. When to synthesize via `ask()`
3. When to use conversational context via `executeChat()`
4. When it has enough context to respond

---

## Implementation Plan

### Phase 1: Enhanced Tool Set

**Expand `src/services/ai-service/tools/openNotebook.ts`:**

```typescript
// Existing tools (enhanced)
searchKnowledgeTool     // Vector/text search with configurable depth
askKnowledgeTool        // Q&A synthesis from knowledge base

// New tools
chatWithNotebookTool    // Multi-turn conversation with notebook context
buildContextTool        // Explicit full context retrieval
searchMultipleTool      // Batch search across multiple queries
```

**Tool Capabilities:**

| Tool | Purpose | When Agent Uses |
|------|---------|-----------------|
| `searchKnowledge` | Find relevant sources | Initial exploration, specific lookups |
| `askKnowledge` | Get synthesized answer | Complex questions, need reasoning |
| `chatWithNotebook` | Multi-turn conversation | Follow-up questions, clarifications |
| `buildContext` | Get full notebook context | Comprehensive overview needed |
| `searchMultiple` | Parallel search queries | Compare topics, gather breadth |

### Phase 2: Agent System Prompt Enhancement

**Modify `src/services/ai-service/agent.ts`:**

New system prompt that teaches the agent retrieval strategy:

```
You are a Research Agent with access to a knowledge base.

RETRIEVAL STRATEGY:
1. START with searchKnowledge(vector) for semantic matches
2. If results are sparse, try searchKnowledge(text) for keyword matches
3. For complex questions, use askKnowledge to get synthesized answers
4. For follow-up depth, use chatWithNotebook to explore a topic
5. Only respond when you have sufficient context

QUALITY GUIDELINES:
- Cite sources with [Source Name] format
- If sources conflict, present both perspectives
- If knowledge base lacks info, say so clearly
- Prefer depth over breadth in responses
```

### Phase 3: Multi-Stage Retrieval Flow

**Remove pre-fetch, let agent drive retrieval:**

```typescript
// BEFORE (current)
async function researchQuery(request: AgentQuery) {
  // Pre-fetch context (fixed strategy)
  const searchResults = await OpenNotebookService.search({...});
  const context = buildContext(searchResults);

  // Generate with pre-built context
  return generateText({ system: contextPrompt, tools: [...] });
}

// AFTER (agent-driven)
async function researchQuery(request: AgentQuery) {
  // No pre-fetch - agent decides what to retrieve
  return generateText({
    system: retrievalStrategyPrompt,
    tools: enhancedKnowledgeTools,  // Full tool set
    stopWhen: stepCountIs(10),      // More steps allowed
  });
}
```

### Phase 4: Source Citation & Quality

**Add source tracking in tools:**

```typescript
interface ToolResult {
  content: string;
  sources: SourceReference[];
  confidence: number;
}

interface SourceReference {
  id: string;
  name: string;
  excerpt: string;
  score: number;
  usedInResponse: boolean;
}
```

**Response includes:**
- All sources consulted
- Which sources were cited
- Confidence level based on source quality

---

## Files to Modify

### Primary Changes
1. `src/services/ai-service/tools/openNotebook.ts`
   - Add `chatWithNotebookTool`
   - Add `buildContextTool`
   - Add `searchMultipleTool`
   - Enhance existing tools with source tracking

2. `src/services/ai-service/agent.ts`
   - Remove pre-fetch logic
   - Update system prompt with retrieval strategy
   - Increase step limit for multi-stage retrieval
   - Add source citation tracking

3. `src/services/ai-service/tools/index.ts`
   - Export new tools
   - Configure tool registry

### Supporting Changes
4. `src/services/OpenNotebookService.ts`
   - Add batch search method for `searchMultiple` tool
   - Expose session management for `chatWithNotebook`

5. `src/services/ai-service/types.ts`
   - Add `SourceReference` type
   - Add `ToolResult` type with sources

---

## Implementation Order

1. **Add new tool types** (types.ts)
2. **Implement chatWithNotebookTool** (openNotebook.ts)
3. **Implement buildContextTool** (openNotebook.ts)
4. **Implement searchMultipleTool** (openNotebook.ts)
5. **Update agent system prompt** (agent.ts)
6. **Remove pre-fetch, wire up tools** (agent.ts)
7. **Add source citation tracking** (agent.ts)
8. **Test with various query types**

---

## Test Scenarios

1. **Simple lookup**: "What is X?" → Single search should suffice
2. **Complex question**: "How does X compare to Y?" → Multiple searches + synthesis
3. **Deep dive**: "Explain everything about X" → buildContext or multi-search
4. **Follow-up**: "Tell me more about that" → chatWithNotebook for context
5. **No knowledge**: "What about Z?" (not in KB) → Agent should acknowledge gap

## Success Criteria

- Agent retrieves more relevant context than fixed pre-fetch
- Responses cite specific sources accurately
- Multi-step retrieval produces better answers for complex queries
- Agent efficiently uses tools (doesn't over-retrieve)
