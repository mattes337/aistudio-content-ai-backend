# Research Streaming API Usage Guide

## Endpoint

```
POST /api/ai/research/stream
```

## Request

```typescript
interface ResearchStreamRequest {
  query: string;           // The research question
  channelId?: string;      // Optional channel filter
  history?: ChatMessage[]; // Conversation history
  verbose?: boolean;       // Enable detailed tool call streaming

  // Optional: Override default models for Open Notebook API
  strategyModel?: string;     // Model for retrieval strategy (default: env OPEN_NOTEBOOK_DEFAULT_MODEL)
  answerModel?: string;       // Model for generating answers (default: env OPEN_NOTEBOOK_DEFAULT_MODEL)
  finalAnswerModel?: string;  // Model for final synthesis (default: env OPEN_NOTEBOOK_DEFAULT_MODEL)
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
```

## Stream Events

The endpoint returns Server-Sent Events (SSE). Each event is a JSON object with a `type` field:

| Type | Description | Fields |
|------|-------------|--------|
| `status` | Progress updates | `status: string` |
| `tool_start` | Tool execution started (verbose only) | `tool`, `toolInput`, `status` |
| `tool_result` | Tool execution completed (verbose only) | `tool`, `toolInput`, `toolResult` |
| `delta` | Incremental text content | `content: string` |
| `sources` | Source references found | `sources: SourceReference[]` |
| `done` | Stream complete | `response`, `sources`, `steps` |
| `error` | Error occurred | `error: string` |

## Frontend Implementation (React/TypeScript)

```tsx
import { useCallback, useState } from 'react';

interface ResearchResult {
  response: string;
  sources: SourceReference[];
  isStreaming: boolean;
  error?: string;
}

export function useResearchStream() {
  const [result, setResult] = useState<ResearchResult>({
    response: '',
    sources: [],
    isStreaming: false,
  });

  const research = useCallback(async (query: string, verbose = false) => {
    setResult({ response: '', sources: [], isStreaming: true });

    try {
      const response = await fetch('/api/ai/research/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, verbose }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case 'delta':
              setResult(prev => ({
                ...prev,
                response: prev.response + data.content,
              }));
              break;

            case 'sources':
              setResult(prev => ({
                ...prev,
                sources: data.sources,
              }));
              break;

            case 'done':
              setResult(prev => ({
                ...prev,
                isStreaming: false,
              }));
              break;

            case 'error':
              setResult(prev => ({
                ...prev,
                isStreaming: false,
                error: data.error,
              }));
              break;

            case 'status':
            case 'tool_start':
            case 'tool_result':
              // Handle verbose events (optional UI feedback)
              console.log(`[${data.type}]`, data);
              break;
          }
        }
      }
    } catch (err) {
      setResult(prev => ({
        ...prev,
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  return { ...result, research };
}
```

## Usage Example

```tsx
function ResearchChat() {
  const { response, sources, isStreaming, error, research } = useResearchStream();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    research(query, true); // verbose=true for detailed output
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a question..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? 'Researching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="response">
        <ReactMarkdown>{response}</ReactMarkdown>
      </div>

      {sources.length > 0 && (
        <div className="sources">
          <h4>Sources</h4>
          <ul>
            {sources.map(s => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <p>{s.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## cURL Example

```bash
# Basic streaming request
curl -N -X POST http://localhost:3000/api/ai/research/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "What is consciousness?", "verbose": false}'

# Verbose mode (shows tool calls)
curl -N -X POST http://localhost:3000/api/ai/research/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "Compare meditation techniques", "verbose": true}'
```

## Verbose Mode Events

When `verbose: true`, you'll receive additional events showing the agent's reasoning:

```json
// Tool starting
{"type":"tool_start","tool":"searchKnowledge","toolInput":{"query":"meditation techniques","type":"vector"},"status":"Calling searchKnowledge..."}

// Tool completed
{"type":"tool_result","tool":"searchKnowledge","toolInput":{"query":"meditation techniques","type":"vector"},"toolResult":{"success":true,"results":[...],"totalCount":5}}
```

This is useful for:
- Debugging search quality
- Showing users what's happening
- Building transparency features
