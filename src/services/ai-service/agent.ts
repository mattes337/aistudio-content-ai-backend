import { generateText, stepCountIs } from 'ai';
import { createModelConfig, selectModel } from './models';
import { researchTools, setRequestModelConfig, clearRequestModelConfig } from './tools';
import type {
  AgentQuery,
  AgentResponse,
  AgentTask,
  ChatMessage,
  SourceReference,
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
  historyContext: string
): string {
  return `You are a Research Agent with access to a knowledge base through multiple tools.

## RETRIEVAL STRATEGY
You decide when and how to retrieve information. Follow this strategy:

1. **START** with searchKnowledge(type: "vector") for semantic matches on the user's question
2. **IF** results are sparse or low-scoring, try searchKnowledge(type: "text") for keyword matches
3. **FOR** complex questions requiring reasoning, use askKnowledge to get a synthesized answer
4. **FOR** comparing multiple topics, use searchMultiple to search several queries in parallel
5. **FOR** follow-up depth on a topic, use chatWithNotebook for multi-turn exploration
6. **FOR** comprehensive overview, use buildContext to get full notebook context
7. **ONLY** respond when you have sufficient context - it's better to search more than guess

## AVAILABLE TOOLS
- **searchKnowledge**: Find specific content (vector=semantic, text=keyword)
- **askKnowledge**: Get AI-synthesized answer from multiple sources
- **searchMultiple**: Search multiple queries in parallel (max 5)
- **chatWithNotebook**: Multi-turn conversation for depth (requires notebookId)
- **buildContext**: Get full notebook context (requires notebookId)

${notebookId ? `## NOTEBOOK ID\nFor tools that require it: "${notebookId}"` : '## NOTE\nNo notebook ID provided - chatWithNotebook and buildContext are unavailable.'}

## CONVERSATION HISTORY
${historyContext || '(No prior conversation)'}

## RESPONSE GUIDELINES
- **NEVER expose your search process** to the user - don't mention which search type you used, don't say "I tried semantic search" or "I will try keyword search"
- **NEVER preface answers** with "Based on the found documents" or similar phrases - just answer directly
- **Answer naturally** as if you simply know the information
- **Cite sources** using [Source Name] format when using information
- **If sources conflict**, present both perspectives with their sources
- **If knowledge base lacks info**, say you don't have information on that topic (don't explain search failures)
- **Prefer depth over breadth** - thorough answers over superficial coverage
- **Use Markdown** for readability
- **Never fabricate** information not found in sources`;
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
      for (const r of result.results as { content: string; source: string; score?: number }[]) {
        const id = `${r.source}-${r.content.substring(0, 50)}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sources.push({
            id,
            name: r.source,
            excerpt: r.content.substring(0, 200),
            score: r.score || 0,
          });
        }
      }
    }

    // Extract from searchMultiple results
    if (tc.name === 'searchMultiple' && Array.isArray(result.searches)) {
      for (const search of result.searches as { query: string; results: { content: string; source: string; score?: number }[] }[]) {
        for (const r of search.results) {
          const id = `${r.source}-${r.content.substring(0, 50)}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            sources.push({
              id,
              name: r.source,
              excerpt: r.content.substring(0, 200),
              score: r.score || 0,
            });
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
  }

  // Sort by score descending
  return sources.sort((a, b) => b.score - a.score);
}

export async function researchQuery(request: AgentQuery): Promise<AgentResponse> {
  logger.info(`Research agent query: "${request.query.substring(0, 50)}..."`);

  // Set model config for tools to use
  setRequestModelConfig(request.modelConfig);

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
  }
}

/**
 * Streaming version of researchQuery that yields progress updates.
 * Uses event queue pattern to yield events from callbacks.
 */
export async function* researchQueryStream(
  request: ResearchStreamOptions
): AsyncGenerator<ResearchStreamChunk> {
  logger.info(`Research agent stream: "${request.query.substring(0, 50)}..." verbose=${request.verbose}`);

  // Set model config for tools to use
  setRequestModelConfig(request.modelConfig);

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

  yield { type: 'status', status: 'Starting research...' };

  try {
    // Build conversation history context
    const historyContext =
      request.history
        ?.map((msg: ChatMessage) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n') || '';

    // Build system prompt with retrieval strategy
    const systemPrompt = buildRetrievalSystemPrompt(request.notebookId, historyContext);

    const modelConfig = createModelConfig(selectModel('agent'));
    const toolCalls: { name: string; args: unknown; result: unknown }[] = [];

    yield { type: 'status', status: 'Searching knowledge base...' };

    // Run generateText in background with callbacks
    const generatePromise = generateText({
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxOutputTokens: modelConfig.maxTokens,
      providerOptions: modelConfig.providerOptions,
      system: systemPrompt,
      prompt: request.query,
      tools: researchTools,
      stopWhen: stepCountIs(request.maxSteps || 10),
      onStepFinish: ({ toolCalls: stepToolCalls, text, stepType }) => {
        logger.info(`Step finished: type=${stepType}, tools=${stepToolCalls?.length || 0}, textLen=${text?.length || 0}`);

        if (stepToolCalls && stepToolCalls.length > 0) {
          for (const tc of stepToolCalls) {
            const tcResult = (tc as any).result;
            toolCalls.push({
              name: tc.toolName,
              args: tc.args,
              result: tcResult,
            });

            if (request.verbose) {
              pushEvent({
                type: 'tool_start',
                tool: tc.toolName,
                toolInput: tc.args as Record<string, unknown>,
                status: `Called ${tc.toolName}`,
              });
              pushEvent({
                type: 'tool_result',
                tool: tc.toolName,
                toolInput: tc.args as Record<string, unknown>,
                toolResult: tcResult,
              });
            }
          }
        }

        // If this step produced text, emit it
        if (text && text.length > 0) {
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
