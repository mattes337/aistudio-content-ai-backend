import { z } from 'zod/v3';
import { repairJsonSyntax, repairJsonWithLLM } from './repair';
import logger from '../../utils/logger';

/**
 * Attempt to repair and parse raw text into a typed object
 *
 * @param text - Raw text from LLM that may contain malformed JSON
 * @param schema - Zod schema to validate against
 * @param schemaDescription - Human-readable description for LLM repair
 * @returns Parsed and validated object, or null if repair fails
 */
export async function repairAndParse<T>(
  text: string,
  schema: z.ZodType<T>,
  schemaDescription: string
): Promise<T | null> {
  if (!text) return null;

  logger.info('Attempting to repair raw text output');

  // Layer 1: Try fast jsonrepair (no API call)
  const syntaxRepaired = repairJsonSyntax(text);
  if (syntaxRepaired) {
    try {
      const parsed = schema.parse(JSON.parse(syntaxRepaired));
      logger.info('Successfully repaired with jsonrepair');
      return parsed;
    } catch (parseError) {
      logger.debug('jsonrepair output did not match schema:', parseError);
    }
  }

  // Layer 2: Try LLM-based repair with schema context
  const llmRepaired = await repairJsonWithLLM(
    text,
    schemaDescription,
    new Error('Output was null - could not parse structured output')
  );

  if (llmRepaired) {
    try {
      const parsed = schema.parse(JSON.parse(llmRepaired));
      logger.info('Successfully repaired with LLM');
      return parsed;
    } catch (parseError) {
      logger.warn('LLM repair output did not match schema:', parseError);
    }
  }

  return null;
}

// Re-export repair utilities for direct use
export { repairJsonSyntax, repairJsonWithLLM, repairJson, createRepairFunction } from './repair';
