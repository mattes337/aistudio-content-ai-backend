import { generateText, stepCountIs } from 'ai';
import { createModelConfig, selectModel } from './models';
import { researchTools, getResearchTools, searchKnowledgeTool, setRequestModelConfig, clearRequestModelConfig, setRequestNotebookId, clearRequestNotebookId } from './tools';
import type {
  AgentQuery,
  AgentResponse,
  AgentTask,
  ChatMessage,
  SourceReference,
  SourceLocation,
  ResearchStreamChunk,
  ResearchStreamOptions,
} from './types';
import { withErrorHandling } from './errors';
import logger from '../../utils/logger';

/**
 * Build the retrieval strategy system prompt for agent-driven knowledge retrieval
 */
function buildRetrievalSystemPrompt(
  notebookId: string | undefined,
  historyContext: string,
  options: { searchWeb?: boolean; enableIntentTools?: boolean } = {}
): string {
  const webSearchSection = options.searchWeb
    ? `
8. **AFTER** searching the knowledge base, use webSearch to supplement with current web information
9. **FOR** comparing web topics, use webSearchMultiple to search several web queries in parallel
10. **COMBINE** knowledge base results with web results for comprehensive answers`
    : '';

  const webToolsSection = options.searchWeb
    ? `
- **webSearch**: Search the web for current information, news, and recent events (use AFTER knowledge base)
- **webSearchMultiple**: Search multiple web queries in parallel (max 5)`
    : '';

  const webGuideline = options.searchWeb
    ? `
- **ALWAYS search knowledge base first**, then supplement with web search`
    : '';

  const webPriorityNote = options.searchWeb
    ? `

## IMPORTANT: SOURCE PRIORITY
1. **ALWAYS search the knowledge base FIRST** using searchKnowledge or askKnowledge
2. **THEN** use webSearch to supplement with current/external information
3. **Knowledge base sources have higher authority** than web sources
4. **Combine both sources** in your response for comprehensive answers
5. **Never skip the knowledge base** - even if the question seems web-focused`
    : '';

  const intentToolsSection = options.enableIntentTools
    ? `

## CONTENT CREATION TOOLS
- **create_article_draft**: Create a new blog article draft. Use when the user asks to "create an article", "draft a post", "write a blog" about a topic.
- **create_post_draft**: Create a social media post. Use when the user asks to "create a post", "draft an Instagram/LinkedIn/Twitter post".
- **create_media_draft**: Generate an image. Use when the user asks to "create an image", "generate media", or "make a visual".

### CRITICAL TOOL CALLING RULES:
1. **CALL IMMEDIATELY**: When the user explicitly asks to create content (article, post, image), CALL THE TOOL IMMEDIATELY.
2. **DO NOT ASK FOR DETAILS**: Generate a creative title/caption and full content yourself based on the conversation history.
3. **USE CONTEXT**: Base the generated content on the research findings and conversation history.
4. **BE CREATIVE**: Generate complete, high-quality content - don't ask the user what they want to include.`
    : '';

  const intentToolsGuideline = options.enableIntentTools
    ? `
- **When asked to CREATE content**, call the appropriate tool with generated content`
    : '';

  return `You are a Research Agent with access to a knowledge base through multiple tools.${options.searchWeb ? ' You also have access to web search, but you MUST ALWAYS search the knowledge base FIRST before using web search.' : ''}
${options.searchWeb ? `
## CRITICAL RULE
**YOU MUST ALWAYS CALL searchKnowledge OR askKnowledge BEFORE calling webSearch.** This is mandatory - never skip the knowledge base. The knowledge base is your primary source of truth.
` : ''}
## RETRIEVAL STRATEGY (MANDATORY STEPS)
You MUST follow this exact retrieval flow for EVERY question. Do NOT skip steps.

### STEP 1: Initial Search (REQUIRED)
- Use searchKnowledge(type: "vector") for semantic matches on the user's question
- If results are sparse (< 3 results) or low-scoring (< 0.3), ALSO try searchKnowledge(type: "text") for keyword matches

### STEP 2: Expand Search for Multi-Entity Queries (IF APPLICABLE)
- When the user mentions multiple distinct entities (people, books, concepts) to compare, use searchMultiple to search each one separately
  - Example: "compare A with B" → searchMultiple with queries: ["A", "B"]
  - Example: "X by Author1 vs Author2" → searchMultiple with queries: ["X Author1", "X Author2"]

### STEP 3: Synthesize with askKnowledge (REQUIRED)
- **ALWAYS** call askKnowledge to get a synthesized answer from the knowledge base
- This is MANDATORY - do NOT skip this step and do NOT generate your own answer from raw search results
- The askKnowledge tool performs deeper retrieval and synthesis than simple search
- Pass the user's question (or a refined version) to askKnowledge

### STEP 4: Additional Depth (OPTIONAL)
- FOR follow-up depth on a topic, use chatWithNotebook for multi-turn exploration
- FOR comprehensive overview, use buildContext to get full notebook context

### CRITICAL RULES
- **NEVER** generate a response saying "I don't have information" without first calling askKnowledge
- **NEVER** rely solely on searchKnowledge results - always call askKnowledge for synthesis
- **ALWAYS** complete Step 1 and Step 3 before generating your final response
- It's better to search more than guess${webSearchSection}

## AVAILABLE TOOLS
- **searchKnowledge**: Find specific content (vector=semantic, text=keyword)
- **askKnowledge**: Get AI-synthesized answer from multiple sources
- **searchMultiple**: Search multiple queries in parallel (max 5)
- **chatWithNotebook**: Multi-turn conversation for depth (requires notebookId)
- **buildContext**: Get full notebook context (requires notebookId)${webToolsSection}${intentToolsSection}

${notebookId ? `## NOTEBOOK ID\nFor tools that require it: "${notebookId}"` : '## NOTE\nNo notebook ID provided - chatWithNotebook and buildContext are unavailable.'}

## CONVERSATION HISTORY
${historyContext || '(No prior conversation)'}

## RESPONSE GUIDELINES
- **NEVER expose your search process** to the user - don't mention which search type you used, don't say "I tried semantic search" or "I will try keyword search"
- **NEVER preface answers** with "Based on the found documents" or similar phrases - just answer directly
- **Answer naturally** as if you simply know the information
- **If sources conflict**, present both perspectives with their sources
- **ONLY say "I don't have information"** AFTER you have called askKnowledge and it returned no useful results
- **Prefer depth over breadth** - thorough answers over superficial coverage
- **Use Markdown** for readability
- **Never fabricate** information not found in sources${webGuideline}${intentToolsGuideline}

## CITATION FORMAT (CRITICAL)
When citing sources, use this EXACT inline reference format:
\`[[ref:id={SOURCE_ID}|name={SOURCE_NAME}]]\`

With optional URL (for web sources):
\`[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|url={URL}]]\`

With optional location:
\`[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|loc={LOCATION_TYPE}:{LOCATION_VALUE}]]\`

With both URL and location:
\`[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|url={URL}|loc={LOCATION_TYPE}:{LOCATION_VALUE}]]\`

Components:
- **id**: The source ID from search results (e.g., "source:abc123" for KB, or use the URL as ID for web)
- **name**: Human-readable source name
- **url**: The full URL (REQUIRED for web search results, optional for KB sources)
- **loc**: Optional location within source (type:value format)

Location types:
- \`line:{number}\` - For text documents
- \`page:{number}\` - For PDFs
- \`chapter:{name}\` - For chapters
- \`section:{name}\` - For sections
- \`timecode:{MM:SS}\` or \`timecode:{HH:MM:SS}\` - For audio/video
- \`index:{number}\` - For indexed content

Examples (Knowledge Base):
- \`[[ref:id=source:abc123|name=Marketing Guide|loc=chapter:3]]\`
- \`[[ref:id=source:xyz789|name=Podcast Episode 42|loc=timecode:15:30]]\`
- \`[[ref:id=source:ghi789|name=User Manual]]\`

Examples (Web Sources - MUST include url):
- \`[[ref:id=web:1|name=Wikipedia Article|url=https://en.wikipedia.org/wiki/Example]]\`
- \`[[ref:id=web:2|name=Research Paper|url=https://example.com/paper.pdf|loc=page:5]]\`

IMPORTANT:
- Always include the source ID and name
- **For web sources, ALWAYS include the url component**
- Include location when the search result provides specific position info
- Place references inline where you use the information, not at the end${webPriorityNote}`;
}

/** Search result interface with source ID and metadata */
interface SearchResultWithMetadata {
  sourceId?: string;
  content: string;
  source: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extract location information from search result metadata
 */
function extractLocationFromMetadata(
  metadata: Record<string, unknown> | undefined
): SourceLocation | undefined {
  if (!metadata) return undefined;

  // Check for various location indicators in metadata
  if (metadata.timecode || metadata.timestamp) {
    return {
      type: 'timecode',
      value: String(metadata.timecode || metadata.timestamp),
      label: `Timecode ${metadata.timecode || metadata.timestamp}`,
    };
  }

  if (metadata.page || metadata.page_number) {
    const pageNum = metadata.page || metadata.page_number;
    return {
      type: 'page',
      value: String(pageNum),
      label: `Page ${pageNum}`,
    };
  }

  if (metadata.chapter) {
    return {
      type: 'chapter',
      value: String(metadata.chapter),
      label: `Chapter ${metadata.chapter}`,
    };
  }

  if (metadata.section) {
    return {
      type: 'section',
      value: String(metadata.section),
      label: `Section: ${metadata.section}`,
    };
  }

  if (metadata.line || metadata.line_number) {
    const lineNum = metadata.line || metadata.line_number;
    return {
      type: 'line',
      value: String(lineNum),
      label: `Line ${lineNum}`,
    };
  }

  if (metadata.chunk_index !== undefined || metadata.index !== undefined) {
    const idx = metadata.chunk_index ?? metadata.index;
    return {
      type: 'index',
      value: String(idx),
      label: `Index ${idx}`,
    };
  }

  return undefined;
}

/**
 * Detect source type from metadata or source name
 */
function detectSourceType(
  sourceName: string,
  metadata: Record<string, unknown> | undefined
): string | undefined {
  if (metadata?.type) return String(metadata.type);
  if (metadata?.source_type) return String(metadata.source_type);

  // Detect from source name patterns
  const lowerName = sourceName.toLowerCase();
  if (lowerName.includes('.pdf')) return 'pdf';
  if (lowerName.includes('.mp3') || lowerName.includes('.wav') || lowerName.includes('audio')) return 'audio';
  if (lowerName.includes('.mp4') || lowerName.includes('.mov') || lowerName.includes('video') || lowerName.includes('youtube')) return 'video';
  if (lowerName.includes('http://') || lowerName.includes('https://') || lowerName.includes('.com') || lowerName.includes('.org')) return 'website';

  return undefined;
}

/**
 * Extract source references from tool call results
 */
function extractSourcesFromToolCalls(
  toolCalls: { name: string; result: unknown }[]
): SourceReference[] {
  const sources: SourceReference[] = [];
  const seenIds = new Set<string>();

  for (const tc of toolCalls) {
    const result = tc.result as Record<string, unknown>;
    if (!result?.success) continue;

    // Extract from searchKnowledge results
    if (tc.name === 'searchKnowledge' && Array.isArray(result.results)) {
      for (const r of result.results as SearchResultWithMetadata[]) {
        // Use actual source ID if available, otherwise generate one
        const id = r.sourceId || `${r.source}-${r.content.substring(0, 50)}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          // Extract URL from metadata if available
          const metaUrl = r.metadata?.url || r.metadata?.source_url || r.metadata?.link;
          const sourceRef: SourceReference = {
            id,
            name: r.source,
            excerpt: r.content.substring(0, 200),
            score: r.score || 0,
            location: extractLocationFromMetadata(r.metadata),
            sourceType: detectSourceType(r.source, r.metadata),
          };
          if (metaUrl) {
            sourceRef.url = String(metaUrl);
          }
          sources.push(sourceRef);
        }
      }
    }

    // Extract from searchMultiple results
    if (tc.name === 'searchMultiple' && Array.isArray(result.searches)) {
      for (const search of result.searches as { query: string; results: SearchResultWithMetadata[] }[]) {
        for (const r of search.results) {
          // Use actual source ID if available, otherwise generate one
          const id = r.sourceId || `${r.source}-${r.content.substring(0, 50)}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            // Extract URL from metadata if available
            const metaUrl = r.metadata?.url || r.metadata?.source_url || r.metadata?.link;
            const sourceRef: SourceReference = {
              id,
              name: r.source,
              excerpt: r.content.substring(0, 200),
              score: r.score || 0,
              location: extractLocationFromMetadata(r.metadata),
              sourceType: detectSourceType(r.source, r.metadata),
            };
            if (metaUrl) {
              sourceRef.url = String(metaUrl);
            }
            sources.push(sourceRef);
          }
        }
      }
    }

    // Extract from askKnowledge (synthesized answer - mark as used)
    if (tc.name === 'askKnowledge' && result.answer) {
      sources.push({
        id: `ask-${(result.question as string)?.substring(0, 30) || 'unknown'}`,
        name: 'Knowledge Base (Synthesized)',
        excerpt: (result.answer as string).substring(0, 200),
        score: 1.0,
        usedInResponse: true,
      });
    }

    // Extract from webSearch results
    if (tc.name === 'webSearch' && Array.isArray(result.results)) {
      for (const r of result.results as { title: string; url: string; content: string; score: number }[]) {
        const id = `web-${r.url}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sources.push({
            id,
            name: r.title,
            excerpt: r.content.substring(0, 200),
            score: r.score || 0,
            sourceType: 'website',
            url: r.url,
          });
        }
      }
    }

    // Extract from webSearchMultiple results
    if (tc.name === 'webSearchMultiple' && Array.isArray(result.searches)) {
      for (const search of result.searches as { query: string; results: { title: string; url: string; content: string; score: number }[] }[]) {
        for (const r of search.results) {
          const id = `web-${r.url}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            sources.push({
              id,
              name: r.title,
              excerpt: r.content.substring(0, 200),
              score: r.score || 0,
              sourceType: 'website',
              url: r.url,
            });
          }
        }
      }
    }
  }

  // Sort by score descending
  return sources.sort((a, b) => b.score - a.score);
}

export async function researchQuery(request: AgentQuery): Promise<AgentResponse> {
  logger.info(`Research agent query: "${request.query.substring(0, 50)}..."`);

  // Set model config and notebook ID for tools to use
  setRequestModelConfig(request.modelConfig);
  setRequestNotebookId(request.notebookId);

  try {
    return await withErrorHandling(
      async () => {
        // Build conversation history context
        const historyContext =
          request.history
            ?.map((msg: ChatMessage) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
            .join('\n') || '';

        // Build system prompt with retrieval strategy (no pre-fetch)
        const systemPrompt = buildRetrievalSystemPrompt(request.notebookId, historyContext);

        // Run agent with full tool set - agent decides what to retrieve
        const modelConfig = createModelConfig(selectModel('agent'));
        const toolCalls: { name: string; result: unknown }[] = [];

        const result = await generateText({
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
          providerOptions: modelConfig.providerOptions,
          system: systemPrompt,
          prompt: request.query,
          tools: researchTools,
          // Allow more steps for multi-stage retrieval
          stopWhen: stepCountIs(request.maxSteps || 10),
          onStepFinish: ({ toolCalls: stepToolCalls }) => {
            if (stepToolCalls) {
              for (const tc of stepToolCalls) {
                toolCalls.push({
                  name: tc.toolName,
                  result: (tc as any).result,
                });
              }
            }
          },
        });

        // Extract sources from all tool calls
        const sources = extractSourcesFromToolCalls(toolCalls);

        return {
          response: result.text,
          sources: sources.length > 0 ? sources : undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          steps: result.steps?.length,
        };
      },
      'researchQuery'
    );
  } finally {
    clearRequestModelConfig();
    clearRequestNotebookId();
  }
}

/**
 * Streaming version of researchQuery that yields progress updates.
 * Uses event queue pattern to yield events from callbacks.
 */
export async function* researchQueryStream(
  request: ResearchStreamOptions
): AsyncGenerator<ResearchStreamChunk> {
  logger.info(`Research agent stream: "${request.query.substring(0, 50)}..." verbose=${request.verbose} searchWeb=${request.searchWeb} enableIntentTools=${request.enableIntentTools}`);

  // Set model config and notebook ID for tools to use
  setRequestModelConfig(request.modelConfig);
  setRequestNotebookId(request.notebookId);

  // Event queue for yielding from callbacks
  const eventQueue: ResearchStreamChunk[] = [];
  let resolveWaiting: (() => void) | null = null;
  let isComplete = false;
  let finalResult: { text: string; steps: any[] } | null = null;
  let finalError: Error | null = null;

  const pushEvent = (event: ResearchStreamChunk) => {
    eventQueue.push(event);
    if (resolveWaiting) {
      resolveWaiting();
      resolveWaiting = null;
    }
  };

  // Generate a short topic summary from the query (first 60 chars, break at word boundary)
  const queryPreview = request.query.length > 60
    ? request.query.substring(0, 60).replace(/\s+\S*$/, '') + '...'
    : request.query;

  yield { type: 'status', status: `Researching: "${queryPreview}"` };

  try {
    // Build conversation history context
    const historyContext =
      request.history
        ?.map((msg: ChatMessage) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n') || '';

    // Build system prompt with retrieval strategy (include web search and intent tools if enabled)
    const systemPrompt = buildRetrievalSystemPrompt(request.notebookId, historyContext, {
      searchWeb: request.searchWeb,
      enableIntentTools: request.enableIntentTools,
    });

    // Get appropriate tools based on options
    const tools = getResearchTools({
      searchWeb: request.searchWeb,
      enableIntentTools: request.enableIntentTools,
    });

    const modelConfig = createModelConfig(selectModel('agent'));
    const toolCalls: { name: string; args: unknown; result: unknown }[] = [];
    let totalSourcesFound = 0;
    let hasEmittedSynthesizing = false;

    yield { type: 'status', status: 'Analyzing query and planning research strategy...' };

    // When searchWeb is enabled, ALWAYS search knowledge base first
    let knowledgeBaseContext = '';
    if (request.searchWeb) {
      yield { type: 'status', status: 'Searching knowledge base first...' };

      const kbToolInput = { query: request.query, type: 'vector' as const, limit: 10, minimum_score: 0 };
      yield {
        type: 'tool_start',
        tool: 'searchKnowledge',
        status: `Searching knowledge base for "${queryPreview}"`,
        ...(request.verbose && { toolInput: kbToolInput }),
      };

      try {
        const kbResult = await searchKnowledgeTool.execute(kbToolInput, { abortSignal: undefined as any, toolCallId: 'initial-kb-search', messages: [] });

        toolCalls.push({
          name: 'searchKnowledge',
          args: kbToolInput,
          result: kbResult,
        });

        if (request.verbose) {
          yield {
            type: 'tool_result',
            tool: 'searchKnowledge',
            toolInput: kbToolInput,
            toolResult: kbResult,
          };
        }

        // Count sources from knowledge base
        if (kbResult && typeof kbResult === 'object' && 'results' in kbResult) {
          const results = (kbResult as { results: unknown[] }).results;
          totalSourcesFound += results.length;
          if (results.length > 0) {
            yield { type: 'status', status: `Found ${results.length} source(s) from knowledge base` };
            // Build context from KB results for the agent
            knowledgeBaseContext = `\n\n## KNOWLEDGE BASE RESULTS (use these as primary sources)\nThe following ${results.length} results were found in the knowledge base. Use these as your PRIMARY sources and cite them appropriately:\n\n${JSON.stringify(results, null, 2)}`;
          }
        }
      } catch (error) {
        logger.error('Initial knowledge base search failed:', error);
        yield { type: 'status', status: 'Knowledge base search encountered an issue, continuing...' };
      }
    }

    // Helper to generate descriptive status for each tool type
    const getToolStatusMessage = (toolName: string, args: Record<string, unknown> | undefined): string => {
      switch (toolName) {
        case 'searchKnowledge': {
          const query = (args?.query as string) || '';
          const preview = query.length > 40 ? query.substring(0, 40).replace(/\s+\S*$/, '') + '...' : query;
          return preview ? `Searching knowledge base for "${preview}"` : 'Searching knowledge base...';
        }
        case 'searchMultiple': {
          const queries = (args?.queries as string[]) || [];
          if (queries.length === 1) {
            const preview = queries[0].length > 40 ? queries[0].substring(0, 40) + '...' : queries[0];
            return `Searching knowledge base for "${preview}"`;
          }
          return queries.length > 0
            ? `Searching knowledge base for ${queries.length} topics`
            : 'Searching knowledge base...';
        }
        case 'askKnowledge': {
          const question = (args?.question as string) || '';
          const preview = question.length > 40 ? question.substring(0, 40).replace(/\s+\S*$/, '') + '...' : question;
          return preview ? `Asking knowledge base: "${preview}"` : 'Asking knowledge base...';
        }
        case 'chatWithNotebook':
          return 'Consulting notebook context...';
        case 'buildContext':
          return 'Gathering full notebook context...';
        case 'webSearch': {
          const query = (args?.query as string) || '';
          const preview = query.length > 40 ? query.substring(0, 40).replace(/\s+\S*$/, '') + '...' : query;
          return preview ? `Searching the web for "${preview}"` : 'Searching the web...';
        }
        case 'webSearchMultiple': {
          const queries = (args?.queries as string[]) || [];
          if (queries.length === 1) {
            const preview = queries[0].length > 40 ? queries[0].substring(0, 40) + '...' : queries[0];
            return `Searching the web for "${preview}"`;
          }
          return queries.length > 0
            ? `Searching the web for ${queries.length} topics`
            : 'Searching the web...';
        }
        default:
          return `Executing ${toolName}...`;
      }
    };

    // Helper to extract source count from tool result
    const getSourceCount = (toolName: string, result: unknown): number => {
      if (!result || typeof result !== 'object') return 0;
      const r = result as Record<string, unknown>;
      if (toolName === 'searchKnowledge' || toolName === 'webSearch') {
        return (r.results as unknown[])?.length || 0;
      }
      if (toolName === 'searchMultiple' || toolName === 'webSearchMultiple') {
        const searches = r.searches as Array<{ results: unknown[] }> | undefined;
        return searches?.reduce((sum, s) => sum + (s.results?.length || 0), 0) || 0;
      }
      return 0;
    };

    // Build the final prompt - include KB context if we did an initial search
    const finalPrompt = knowledgeBaseContext
      ? `${request.query}${knowledgeBaseContext}`
      : request.query;

    // Run generateText in background with callbacks
    const generatePromise = generateText({
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxOutputTokens: modelConfig.maxTokens,
      providerOptions: modelConfig.providerOptions,
      system: systemPrompt,
      prompt: finalPrompt,
      tools,
      stopWhen: stepCountIs(request.maxSteps || 10),
      onStepFinish: ({ toolCalls: stepToolCalls, text, stepType }) => {
        logger.info(`Step finished: type=${stepType}, tools=${stepToolCalls?.length || 0}, textLen=${text?.length || 0}`);

        if (stepToolCalls && stepToolCalls.length > 0) {
          let stepSourceCount = 0;

          for (const tc of stepToolCalls) {
            const tcResult = (tc as any).result;
            // Note: AI SDK uses 'input' for tool arguments, not 'args'
            const toolInput = (tc as any).input as Record<string, unknown> | undefined;

            toolCalls.push({
              name: tc.toolName,
              args: toolInput,
              result: tcResult,
            });

            // Check if this is an intent tool call (content creation)
            const intentToolNames = ['create_article_draft', 'create_post_draft', 'create_media_draft'];
            if (intentToolNames.includes(tc.toolName)) {
              // Emit tool_call event with the intent result
              const intentResult = tcResult as Record<string, unknown>;
              if (intentResult?.success && intentResult?.type) {
                pushEvent({
                  type: 'tool_call',
                  tool: tc.toolName,
                  status: `Created ${tc.toolName.replace('create_', '').replace('_', ' ')}`,
                  intentResult: {
                    type: intentResult.type as 'article_draft' | 'post_draft' | 'media_draft',
                    title: intentResult.title as string | undefined,
                    content: intentResult.content as string | undefined,
                    caption: intentResult.caption as string | undefined,
                    platform: intentResult.platform as string | undefined,
                    prompt: intentResult.prompt as string | undefined,
                  },
                });
              }
              continue; // Skip source counting for intent tools
            }

            // Count sources from this tool call
            const sourceCount = getSourceCount(tc.toolName, tcResult);
            stepSourceCount += sourceCount;
            totalSourcesFound += sourceCount;

            // Always emit descriptive status message for tool start
            const statusMessage = getToolStatusMessage(tc.toolName, toolInput);
            pushEvent({
              type: 'tool_start',
              tool: tc.toolName,
              status: statusMessage,
              ...(request.verbose && { toolInput }),
            });

            // Emit tool_result only in verbose mode
            if (request.verbose) {
              pushEvent({
                type: 'tool_result',
                tool: tc.toolName,
                toolInput,
                toolResult: tcResult,
              });
            }
          }

          // Emit status about sources found from this step
          if (stepSourceCount > 0) {
            pushEvent({
              type: 'status',
              status: `Found ${stepSourceCount} relevant source${stepSourceCount === 1 ? '' : 's'}`,
            });
          }
        }

        // If this step produced text (synthesis happening), emit status then content
        if (text && text.length > 0) {
          if (!hasEmittedSynthesizing && totalSourcesFound > 0) {
            pushEvent({
              type: 'status',
              status: `Synthesizing answer from ${totalSourcesFound} source${totalSourcesFound === 1 ? '' : 's'}...`,
            });
            hasEmittedSynthesizing = true;
          } else if (!hasEmittedSynthesizing) {
            pushEvent({ type: 'status', status: 'Generating response...' });
            hasEmittedSynthesizing = true;
          }
          pushEvent({ type: 'delta', content: text });
        }
      },
    })
      .then((result) => {
        finalResult = { text: result.text, steps: result.steps || [] };
        isComplete = true;
        if (resolveWaiting) {
          resolveWaiting();
          resolveWaiting = null;
        }
      })
      .catch((err) => {
        finalError = err;
        isComplete = true;
        if (resolveWaiting) {
          resolveWaiting();
          resolveWaiting = null;
        }
      });

    // Yield events as they come in
    while (!isComplete || eventQueue.length > 0) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift()!;
      } else if (!isComplete) {
        // Wait for next event or completion
        await new Promise<void>((resolve) => {
          resolveWaiting = resolve;
        });
      }
    }

    // Check for error
    if (finalError) {
      throw finalError;
    }

    // Extract sources from all tool calls
    const sources = extractSourcesFromToolCalls(
      toolCalls.map((tc) => ({ name: tc.name, result: tc.result }))
    );

    if (sources.length > 0) {
      yield { type: 'sources', sources };
    }

    yield {
      type: 'done',
      response: finalResult?.text || '',
      sources: sources.length > 0 ? sources : undefined,
      steps: finalResult?.steps?.length || 0,
    };
  } catch (error) {
    logger.error('Research stream error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    clearRequestModelConfig();
    clearRequestNotebookId();
  }
}

export async function executeTask(task: AgentTask): Promise<Record<string, unknown>> {
  logger.info(`Executing agent task: ${task.type}`);

  return withErrorHandling(
    async () => {
      let prompt = '';
      switch (task.type) {
        case 'create_article_draft':
          prompt = `Create a blog article with the following requirements:
Title: ${task.params.title || 'Generate an appropriate title'}
Topic: ${task.params.topic || 'Based on context'}
Content guidelines: ${task.params.guidelines || 'Professional, informative, engaging'}

Generate the full HTML content for the article body.`;
          break;

        case 'create_post_draft':
          prompt = `Create a social media post:
Platform: ${task.params.platform || 'Instagram'}
Topic: ${task.params.topic || 'Based on context'}
Tone: ${task.params.tone || 'Engaging and authentic'}

Generate the caption with emojis and relevant hashtags.`;
          break;

        case 'create_media_draft':
          prompt = `Generate a detailed image prompt:
Subject: ${task.params.subject || 'Based on context'}
Style: ${task.params.style || 'Modern, professional'}

Create a detailed, specific prompt suitable for an image generation model.`;
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const modelConfig = createModelConfig(selectModel('agent'));

      const result = await generateText({
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        providerOptions: modelConfig.providerOptions,
        prompt,
      });

      return { type: task.type, result: result.text };
    },
    'executeTask'
  );
}
