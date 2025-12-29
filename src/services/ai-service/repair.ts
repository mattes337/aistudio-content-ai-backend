import { generateText } from 'ai';
import { jsonrepair } from 'jsonrepair';
import { google, MODELS } from './models';
import logger from '../../utils/logger';

/**
 * Layer 1: Fast JSON repair using jsonrepair library
 * Fixes common syntax errors without API calls:
 * - Missing quotes around keys/values
 * - Trailing commas
 * - Missing commas
 * - Unescaped characters
 * - Truncated JSON
 */
export function repairJsonSyntax(text: string): string | null {
  try {
    // Clean up common LLM output artifacts
    let cleaned = text.trim();

    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Use jsonrepair to fix syntax errors
    const repaired = jsonrepair(cleaned);

    // Validate it's actually valid JSON
    JSON.parse(repaired);

    logger.info('Successfully repaired JSON with jsonrepair');
    return repaired;
  } catch (error) {
    logger.debug('jsonrepair could not fix the JSON:', error);
    return null;
  }
}

/**
 * Layer 2: LLM-based JSON repair
 * Used when jsonrepair fails - handles semantic/structural issues
 */
export async function repairJsonWithLLM(
  text: string,
  schemaDescription: string,
  error: Error
): Promise<string | null> {
  logger.info(`Attempting LLM repair for: ${schemaDescription}`);

  try {
    const { text: repairedText } = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      maxOutputTokens: 2048,
      system: `You are a JSON repair assistant. The expected output should be: ${schemaDescription}
Fix the malformed JSON and return ONLY valid JSON, nothing else. Do not include markdown code blocks.
The error was: ${error.message}`,
      prompt: `Fix this malformed JSON:\n\n${text}`,
    });

    if (repairedText) {
      // Clean up potential markdown code blocks
      let cleaned = repairedText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      JSON.parse(cleaned); // Validate
      logger.info(`Successfully repaired JSON with LLM for: ${schemaDescription}`);
      return cleaned;
    }

    return null;
  } catch (repairError) {
    logger.warn(`LLM repair failed for ${schemaDescription}:`, repairError);
    return null;
  }
}

/**
 * Combined repair strategy: tries fast repair first, then LLM repair
 */
export async function repairJson(
  text: string,
  schemaDescription: string,
  error: Error
): Promise<string | null> {
  // Layer 1: Try fast jsonrepair first (no API call)
  const syntaxRepaired = repairJsonSyntax(text);
  if (syntaxRepaired) {
    return syntaxRepaired;
  }

  // Layer 2: Fall back to LLM repair for semantic issues
  return repairJsonWithLLM(text, schemaDescription, error);
}

/**
 * Create a repair function bound to a specific schema description
 * Compatible with AI SDK's repairText callback signature
 */
export function createRepairFunction(schemaDescription: string) {
  return async ({ text, error }: { text: string; error: Error }): Promise<string | null> => {
    return repairJson(text, schemaDescription, error);
  };
}

/**
 * Repair malformed JSON output using combined strategy
 * Generic version without schema description
 */
export async function repairJsonOutput({ text, error }: { text: string; error: Error }): Promise<string | null> {
  logger.info('Attempting to repair malformed JSON output');

  // Layer 1: Try fast jsonrepair first
  const syntaxRepaired = repairJsonSyntax(text);
  if (syntaxRepaired) {
    return syntaxRepaired;
  }

  // Layer 2: Fall back to LLM repair
  try {
    const { text: repairedText } = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      maxOutputTokens: 2048,
      system: `You are a JSON repair assistant. Fix the malformed JSON and return ONLY valid JSON, nothing else.
The JSON had this error: ${error.message}`,
      prompt: `Fix this malformed JSON and return only the corrected JSON:\n\n${text}`,
    });

    if (repairedText) {
      let cleaned = repairedText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      JSON.parse(cleaned);
      logger.info('Successfully repaired JSON output');
      return cleaned;
    }

    return null;
  } catch (repairError) {
    logger.warn('Failed to repair JSON output:', repairError);
    return null;
  }
}
