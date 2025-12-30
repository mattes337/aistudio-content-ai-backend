import { generateText, streamText, stepCountIs } from 'ai';
import { createModelConfig, selectModel } from './models';
import { researchTools } from './tools';
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

## QUALITY GUIDELINES
- **Cite sources** using [Source Name] format when using information
- **If sources conflict**, present both perspectives with their sources
- **If knowledge base lacks info**, acknowledge the gap clearly
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

  return withErrorHandling(
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
}

/**
 * Streaming version of researchQuery that yields progress updates
 */
export async function* researchQueryStream(
  request: ResearchStreamOptions
): AsyncGenerator<ResearchStreamChunk> {
  logger.info(`Research agent stream: "${request.query.substring(0, 50)}..." verbose=${request.verbose}`);

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

    // Use streamText with fullStream for granular events
    const result = streamText({
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxOutputTokens: modelConfig.maxTokens,
      providerOptions: modelConfig.providerOptions,
      system: systemPrompt,
      prompt: request.query,
      tools: researchTools,
      maxSteps: request.maxSteps || 10,
    });

    // Use fullStream for real-time events
    let fullResponse = '';
    let stepCount = 0;
    const pendingToolCalls = new Map<string, Record<string, unknown>>(); // toolCallId -> args

    for await (const part of result.fullStream) {
      logger.debug(`Stream event: ${part.type}`, { partType: part.type });

      switch (part.type) {
        case 'step-start':
          stepCount++;
          logger.info(`Step ${stepCount} started`);
          if (request.verbose) {
            yield { type: 'status', status: `Step ${stepCount}: Processing...` };
          }
          break;

        case 'tool-call':
          logger.info(`Tool call: ${part.toolName}`, { args: part.args });
          // Store args for later matching with tool-result
          pendingToolCalls.set(part.toolCallId, part.args as Record<string, unknown>);
          if (request.verbose) {
            yield {
              type: 'tool_start',
              tool: part.toolName,
              toolInput: part.args as Record<string, unknown>,
              status: `Calling ${part.toolName}...`,
            };
          }
          break;

        case 'tool-result':
          logger.info(`Tool result: ${part.toolName}`, { hasResult: !!part.result });
          // Get args from pending calls
          const args = pendingToolCalls.get(part.toolCallId) || {};
          toolCalls.push({
            name: part.toolName,
            args,
            result: part.result,
          });
          if (request.verbose) {
            yield {
              type: 'tool_result',
              tool: part.toolName,
              toolInput: args,
              toolResult: part.result,
            };
          }
          break;

        case 'text-delta':
          fullResponse += part.textDelta;
          yield { type: 'delta', content: part.textDelta };
          break;

        case 'step-finish':
          logger.info(`Step ${stepCount} finished`, {
            finishReason: (part as any).finishReason,
            hasText: !!fullResponse,
          });
          break;

        case 'finish':
          logger.info('Stream finished', {
            finishReason: (part as any).finishReason,
            totalSteps: stepCount,
            responseLength: fullResponse.length,
          });
          break;

        case 'error':
          logger.error('Stream error:', part.error);
          yield {
            type: 'error',
            error: part.error instanceof Error ? part.error.message : String(part.error),
          };
          break;

        default:
          logger.debug(`Unhandled stream event: ${(part as any).type}`);
      }
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
      response: fullResponse,
      sources: sources.length > 0 ? sources : undefined,
      steps: stepCount,
    };
  } catch (error) {
    logger.error('Research stream error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
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
