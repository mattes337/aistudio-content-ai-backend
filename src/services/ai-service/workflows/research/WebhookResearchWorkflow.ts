/**
 * Webhook Research Workflow
 *
 * Forwards research requests to an external webhook service.
 * Supports both streaming and non-streaming responses.
 */

import { loadEnvConfig } from '../../../../utils/env';
import logger from '../../../../utils/logger';
import type {
  AgentQuery,
  AgentResponse,
  ResearchStreamChunk,
  ResearchStreamOptions,
} from '../../types';
import type { ResearchWorkflow } from '../types';

const config = loadEnvConfig();

/**
 * Parse a single SSE message into ResearchStreamChunks
 */
function parseSSEMessage(message: string): ResearchStreamChunk[] {
  const chunks: ResearchStreamChunk[] = [];
  const lines = message.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data) as ResearchStreamChunk;
        chunks.push(parsed);
      } catch (e) {
        logger.warn('Failed to parse SSE data:', data);
      }
    }
  }

  return chunks;
}

/**
 * Webhook-based research workflow
 */
export class WebhookResearchWorkflow implements ResearchWorkflow {
  readonly type = 'research' as const;
  readonly id = 'webhook';
  readonly name = 'Webhook Research';
  readonly description = 'Forwards research requests to an external webhook service';

  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || config.researchWebhookUrl;
  }

  isAvailable(): boolean {
    return !!this.webhookUrl;
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  async execute(request: AgentQuery): Promise<AgentResponse> {
    if (!this.isAvailable()) {
      throw new Error('Webhook research workflow is not configured');
    }

    logger.info(`[WebhookResearch] Query: "${request.query.substring(0, 50)}..." -> ${this.webhookUrl}`);

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: request.query,
        channelId: request.channelId,
        history: request.history,
        notebookId: request.notebookId,
        modelConfig: request.modelConfig,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(`Webhook request failed: ${response.status} - ${errorText}`);
      throw new Error(`Webhook request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json() as AgentResponse;
    logger.info(`[WebhookResearch] Received response with ${result.sources?.length || 0} sources`);

    return result;
  }

  async *executeStream(request: ResearchStreamOptions): AsyncGenerator<ResearchStreamChunk> {
    if (!this.isAvailable()) {
      yield {
        type: 'error',
        error: 'Webhook research workflow is not configured',
      };
      return;
    }

    logger.info(`[WebhookResearch] Stream: "${request.query.substring(0, 50)}..." verbose=${request.verbose} searchWeb=${request.searchWeb} -> ${this.webhookUrl}`);

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        query: request.query,
        channelId: request.channelId,
        history: request.history,
        notebookId: request.notebookId,
        verbose: request.verbose,
        searchWeb: request.searchWeb,
        modelConfig: request.modelConfig,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(`Webhook streaming request failed: ${response.status} - ${errorText}`);
      yield {
        type: 'error',
        error: `Webhook request failed with status ${response.status}: ${errorText}`,
      };
      return;
    }

    if (!response.body) {
      logger.error('Webhook response has no body');
      yield {
        type: 'error',
        error: 'Webhook response has no body',
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining data in the buffer
          if (buffer.trim()) {
            const chunks = parseSSEMessage(buffer);
            for (const chunk of chunks) {
              yield chunk;
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (ending with double newline)
        const messages = buffer.split('\n\n');
        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim()) continue;

          const chunks = parseSSEMessage(message);
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      }
    } catch (error) {
      logger.error('Error reading webhook stream:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Error reading webhook stream',
      };
    } finally {
      reader.releaseLock();
    }

    logger.info('[WebhookResearch] Stream completed');
  }
}
