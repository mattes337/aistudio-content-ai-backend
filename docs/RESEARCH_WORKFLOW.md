# Research Workflow Documentation

This document describes the AI-powered research workflow implemented in the backend. It is designed to be adaptable for implementation in N8N, Make.com, or other workflow automation tools.

## Overview

The research workflow is an agentic retrieval system that searches a knowledge base (via Open Notebook API) and optionally the web (via Tavily API) to answer user questions. It uses a multi-step retrieval strategy to ensure comprehensive results.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESEARCH WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐   │
│  │  Input   │───▶│ Step 1:      │───▶│ Step 2:     │───▶│ Step 3:      │   │
│  │  Query   │    │ Vector Search│    │ Multi-Query │    │ askKnowledge │   │
│  └──────────┘    │ (REQUIRED)   │    │ (IF NEEDED) │    │ (REQUIRED)   │   │
│                  └──────────────┘    └─────────────┘    └──────────────┘   │
│                         │                                      │            │
│                         ▼                                      ▼            │
│                  ┌──────────────┐                      ┌──────────────┐    │
│                  │ Step 1b:     │                      │ Step 4:      │    │
│                  │ Text Search  │                      │ Web Search   │    │
│                  │ (IF SPARSE)  │                      │ (OPTIONAL)   │    │
│                  └──────────────┘                      └──────────────┘    │
│                                                               │            │
│                                                               ▼            │
│                                                        ┌──────────────┐    │
│                                                        │   Generate   │    │
│                                                        │   Response   │    │
│                                                        └──────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The user's research question |
| `notebookId` | string | No | Knowledge base notebook ID (enables additional tools) |
| `history` | array | No | Previous conversation messages for context |
| `searchWeb` | boolean | No | Enable web search (default: false) |
| `maxSteps` | number | No | Maximum agent steps (default: 10) |
| `verbose` | boolean | No | Stream verbose tool execution details |

## Workflow Steps

### Step 1: Initial Vector Search (REQUIRED)

Perform semantic search on the knowledge base to find contextually relevant content.

**Tool:** `searchKnowledge`

**Input:**
```json
{
  "query": "<user's question>",
  "type": "vector",
  "limit": 10,
  "minimum_score": 0
}
```

**Output:**
```json
{
  "success": true,
  "results": [
    {
      "sourceId": "source:abc123",
      "content": "...",
      "source": "Source Name",
      "score": 0.85,
      "metadata": {}
    }
  ],
  "totalCount": 42
}
```

**Decision Logic:**
- If results < 3 OR highest score < 0.3 → Continue to Step 1b (Text Search)
- Otherwise → Continue to Step 2

---

### Step 1b: Text Search (CONDITIONAL)

Fallback to keyword matching when semantic search yields sparse results.

**Tool:** `searchKnowledge`

**Input:**
```json
{
  "query": "<user's question>",
  "type": "text",
  "limit": 10,
  "minimum_score": 0
}
```

**Output:** Same structure as Step 1

---

### Step 2: Multi-Query Search (CONDITIONAL)

For questions involving multiple entities, topics, or comparisons, search each entity separately.

**Trigger Conditions:**
- User asks to "compare X with Y"
- User mentions multiple authors, books, or concepts
- User asks about "X vs Y"

**Tool:** `searchMultiple`

**Input:**
```json
{
  "queries": ["topic A", "topic B", "topic C"],
  "type": "vector",
  "limitPerQuery": 5
}
```

**Output:**
```json
{
  "success": true,
  "searches": [
    {
      "query": "topic A",
      "results": [...],
      "totalCount": 15
    },
    {
      "query": "topic B",
      "results": [...],
      "totalCount": 8
    }
  ],
  "totalQueries": 2
}
```

---

### Step 3: Ask Knowledge Synthesis (REQUIRED)

This step is MANDATORY. It performs deeper retrieval and AI-powered synthesis across multiple sources.

**Tool:** `askKnowledge`

**Input:**
```json
{
  "question": "<user's question or refined version>"
}
```

**Output:**
```json
{
  "success": true,
  "answer": "Synthesized answer based on knowledge base...",
  "question": "The question that was asked"
}
```

**Important:** Never skip this step. Never say "I don't have information" without calling this tool first.

---

### Step 4: Web Search (OPTIONAL)

When `searchWeb` is enabled, supplement knowledge base results with current web information.

**Priority:** Knowledge base sources have higher authority than web sources.

**Tool:** `webSearch`

**Input:**
```json
{
  "query": "<search query>",
  "maxResults": 5
}
```

**Output:**
```json
{
  "success": true,
  "results": [
    {
      "title": "Page Title",
      "url": "https://example.com/page",
      "content": "Snippet content...",
      "score": 0.92,
      "publishedDate": "2024-01-15"
    }
  ],
  "totalCount": 5
}
```

**For multiple web queries:**

**Tool:** `webSearchMultiple`

**Input:**
```json
{
  "queries": ["query 1", "query 2"],
  "maxResultsPerQuery": 3
}
```

---

### Step 5: Generate Response

Synthesize all gathered information into a final response with proper citations.

**Citation Format:**
```
[[ref:id={SOURCE_ID}|name={SOURCE_NAME}]]
[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|url={URL}]]
[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|loc={LOCATION_TYPE}:{LOCATION_VALUE}]]
```

**Location Types:**
- `line:{number}` - Text documents
- `page:{number}` - PDFs
- `chapter:{name}` - Book chapters
- `section:{name}` - Document sections
- `timecode:{MM:SS}` or `timecode:{HH:MM:SS}` - Audio/Video
- `index:{number}` - Indexed content

---

## Additional Tools (Context-Dependent)

### Chat with Notebook

Multi-turn conversation for deep exploration of a topic.

**Tool:** `chatWithNotebook`

**Requires:** `notebookId`

**Input:**
```json
{
  "message": "Follow-up question...",
  "notebookId": "notebook-uuid",
  "newSession": false
}
```

---

### Build Context

Retrieve full notebook context for comprehensive overview.

**Tool:** `buildContext`

**Requires:** `notebookId`

**Input:**
```json
{
  "notebookId": "notebook-uuid"
}
```

**Output:**
```json
{
  "success": true,
  "context": "Full notebook context...",
  "tokenCount": 15000,
  "charCount": 60000
}
```

---

## Streaming Events

The workflow streams events to provide real-time progress updates:

| Event Type | Description |
|------------|-------------|
| `status` | Progress message (e.g., "Searching knowledge base...") |
| `tool_start` | Tool execution started |
| `tool_result` | Tool execution completed (verbose mode) |
| `delta` | Incremental text content |
| `sources` | Source references found |
| `done` | Workflow completed |
| `error` | Error occurred |

**Event Structure:**
```json
{
  "type": "status",
  "status": "Found 5 relevant sources",
  "tool": "searchKnowledge",
  "toolInput": {},
  "toolResult": {},
  "content": "",
  "sources": [],
  "response": "",
  "steps": 0,
  "error": ""
}
```

---

## N8N Implementation Guide

### Recommended Node Structure

1. **Webhook Node** - Receive research request
2. **Set Node** - Initialize variables
3. **HTTP Request Node** - Step 1: Vector Search
4. **IF Node** - Check if results are sparse
5. **HTTP Request Node** - Step 1b: Text Search (conditional)
6. **Code Node** - Detect multi-entity queries
7. **HTTP Request Node** - Step 2: Multi-Query Search (conditional)
8. **HTTP Request Node** - Step 3: Ask Knowledge (REQUIRED)
9. **IF Node** - Check if web search enabled
10. **HTTP Request Node** - Step 4: Web Search (conditional)
11. **Code Node** - Generate final response with citations
12. **Respond to Webhook Node** - Return result

### API Endpoints

**Open Notebook API Base:** `https://api.opennotebook.cloud/v1`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search` | POST | Vector/text search |
| `/ask` | POST | AI-synthesized answer |
| `/notebooks/{id}/chat` | POST | Create chat session |
| `/chat/{session_id}` | POST | Execute chat |
| `/notebooks/{id}/context` | GET | Build full context |

**Tavily API Base:** `https://api.tavily.com`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search` | POST | Web search |

---

## Configuration

### Environment Variables

```env
# Open Notebook API
OPEN_NOTEBOOK_API_KEY=your_api_key

# Tavily Web Search (optional)
TAVILY_API_KEY=your_tavily_key

# Gemini AI (for agent)
GEMINI_API_KEY=your_gemini_key
```

### Model Configuration

| Task | Model | Temperature | Max Tokens | Thinking Level |
|------|-------|-------------|------------|----------------|
| Agent | gemini-2.5-pro | 0.3 | 4096 | medium |
| Research | gemini-2.5-pro | 0.7 | 4096 | low |

---

## Error Handling

1. **Search fails:** Log error, continue with available results
2. **No results found:** Try text search before giving up
3. **Web search fails:** Continue with knowledge base results only
4. **askKnowledge fails:** Log error, synthesize from raw search results
5. **All sources empty:** Return "I don't have information on this topic"

---

## Best Practices

1. **Always call askKnowledge** - This is mandatory for synthesis
2. **Never fabricate information** - Only use content from sources
3. **Cite sources inline** - Use the reference format for traceability
4. **Prioritize knowledge base** - Web sources are supplementary
5. **Search multiple entities separately** - Don't rely on single search for comparisons
6. **Lower temperature for consistency** - Agent uses 0.3 for deterministic tool calling
