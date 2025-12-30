/**
 * Research Prompts API Examples
 *
 * Endpoint: POST /api/ai/research
 *
 * The backend automatically uses the catchall notebook ("Research - All Sources")
 * which contains ALL knowledge sources synced by the processor.
 */

// --- Example 1: Research across ALL channels (default behavior) ---

const researchAllChannels = async () => {
  const response = await fetch('/api/ai/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'What are the main themes discussed in our content?',
      // No channelId = searches entire knowledge base
    }),
  });

  const result = await response.json();
  // result: { response: string, sources?: SourceReference[], steps?: number }
  console.log('Answer:', result.response);
  console.log('Sources:', result.sources);
};


// --- Example 2: Research filtered to ONE specific channel ---

const researchOneChannel = async (channelId: string) => {
  const response = await fetch('/api/ai/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Summarize recent topics covered',
      channelId: channelId, // Filter results to this channel's sources
    }),
  });

  const result = await response.json();
  console.log('Answer:', result.response);
  console.log('Sources:', result.sources);
};


// --- Example 3: Multi-turn research conversation ---

const researchWithHistory = async () => {
  const response = await fetch('/api/ai/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Can you elaborate on the second point?',
      history: [
        { role: 'user', text: 'What are our top 3 content themes?' },
        { role: 'assistant', text: '1. Technology trends\n2. Industry news\n3. How-to guides' },
      ],
    }),
  });

  const result = await response.json();
  console.log('Follow-up answer:', result.response);
};


// --- Request/Response Types ---

interface ResearchRequest {
  query: string;           // Required: Research question
  channelId?: string;      // Optional: Filter to specific channel's sources
  history?: ChatMessage[]; // Optional: Conversation context
}

interface ResearchResponse {
  response: string;                    // AI-generated answer
  sources?: SourceReference[];         // Knowledge sources used
  toolCalls?: { name: string; result: unknown }[];
  steps?: number;                      // Reasoning steps taken
}

interface SourceReference {
  id: string;
  name: string;
  excerpt: string;
  score: number;
  usedInResponse?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
