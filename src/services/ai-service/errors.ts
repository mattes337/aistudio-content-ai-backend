export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class RateLimitError extends AIServiceError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'RATE_LIMIT', true, originalError);
    this.name = 'RateLimitError';
  }
}

export class ModelUnavailableError extends AIServiceError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'MODEL_UNAVAILABLE', true, originalError);
    this.name = 'ModelUnavailableError';
  }
}

export class ContentFilterError extends AIServiceError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'CONTENT_FILTER', false, originalError);
    this.name = 'ContentFilterError';
  }
}

export class InvalidResponseError extends AIServiceError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'INVALID_RESPONSE', false, originalError);
    this.name = 'InvalidResponseError';
  }
}

// Check if error is a rate limit error
function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many requests');
}

// Check if error is retryable (transient errors)
function isRetryableError(errorMessage: string, errorName?: string): boolean {
  return (
    errorName === 'AI_NoOutputGeneratedError' ||
    errorMessage.includes('No output generated') ||
    errorMessage.includes('No output') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('JSON') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('Unexpected token') ||
    errorMessage.includes('503') ||
    errorMessage.includes('500')
  );
}

// Check if this is an AI SDK "No output generated" error
function isNoOutputError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AI_NoOutputGeneratedError' || error.message.includes('No output generated');
}

// Extract retry-after delay from error (in milliseconds)
function getRetryAfterMs(error: unknown): number | null {
  if (!(error instanceof Error)) return null;

  // Try to extract from error properties (some SDKs include this)
  const anyError = error as any;
  if (anyError.retryAfter) {
    return typeof anyError.retryAfter === 'number' ? anyError.retryAfter * 1000 : parseInt(anyError.retryAfter) * 1000;
  }

  // Try to extract from headers if available
  if (anyError.response?.headers?.['retry-after']) {
    const retryAfter = anyError.response.headers['retry-after'];
    return parseInt(retryAfter) * 1000;
  }

  // Try to parse from error message (e.g., "retry after 60 seconds")
  const match = error.message.match(/retry\s*(?:after\s*)?(\d+)\s*(?:seconds?|s)/i);
  if (match) {
    return parseInt(match[1]) * 1000;
  }

  return null;
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Error handler wrapper with retry logic
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: () => Promise<T>,
  maxRetries: number = 4
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : undefined;

      // Handle rate limiting - retry with backoff from response
      if (isRateLimitError(error) && attempt < maxRetries) {
        const retryAfterMs = getRetryAfterMs(error);
        // Use retry-after if provided, otherwise exponential backoff starting at 10s
        const backoffMs = retryAfterMs ?? Math.min(10000 * Math.pow(2, attempt), 120000);
        await delay(backoffMs);
        continue;
      }

      // Handle content filter - not retryable
      if (errorMessage.includes('content-filter') || errorMessage.includes('safety')) {
        throw new ContentFilterError(`Content was filtered during ${context}`, error);
      }

      // Handle model unavailable - not retryable
      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        throw new ModelUnavailableError(`Model unavailable during ${context}`, error);
      }

      // Retry for transient errors with exponential backoff
      if (isRetryableError(errorMessage, errorName) && attempt < maxRetries) {
        // Use moderate delays with jitter
        const baseDelay = isNoOutputError(error) ? 3000 : 1500;
        const jitter = Math.random() * 1000;
        const backoffMs = Math.min(baseDelay * Math.pow(1.5, attempt) + jitter, 15000);
        await delay(backoffMs);
        continue;
      }

      // No more retries, try fallback if available
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          throw new AIServiceError(
            `Both primary and fallback operations failed during ${context}`,
            'FALLBACK_FAILED',
            false,
            { primary: error, fallback: fallbackError }
          );
        }
      }
    }
  }

  // Re-throw as AIServiceError
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new AIServiceError(
    `Operation failed during ${context}: ${errorMessage}`,
    'UNKNOWN',
    false,
    lastError
  );
}
