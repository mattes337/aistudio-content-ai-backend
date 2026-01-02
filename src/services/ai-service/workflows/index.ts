/**
 * AI Workflows
 *
 * Central export point for all workflow implementations and the registry.
 * Workflows are registered on module load.
 */

// Export types
export * from './types';

// Export registry
export {
  WorkflowRegistry,
  getResearchWorkflow,
  getMetadataWorkflow,
  getContentWorkflow,
  getImageWorkflow,
  getBulkWorkflow,
  getTaskWorkflow,
} from './registry';

// Export workflow implementations
export { BuiltinResearchWorkflow, WebhookResearchWorkflow } from './research';
export { BuiltinMetadataWorkflow } from './metadata';
export { BuiltinContentWorkflow } from './content';
export { BuiltinImageWorkflow } from './image';
export { BuiltinBulkWorkflow } from './bulk';
export { BuiltinTaskWorkflow } from './task';

// Import for registration
import { WorkflowRegistry } from './registry';
import { BuiltinResearchWorkflow, WebhookResearchWorkflow } from './research';
import { BuiltinMetadataWorkflow } from './metadata';
import { BuiltinContentWorkflow } from './content';
import { BuiltinImageWorkflow } from './image';
import { BuiltinBulkWorkflow } from './bulk';
import { BuiltinTaskWorkflow } from './task';
import logger from '../../../utils/logger';

/**
 * Initialize all workflows and register them with the registry
 */
export function initializeWorkflows(): void {
  logger.info('Initializing AI workflows...');

  // Research workflows
  const builtinResearch = new BuiltinResearchWorkflow();
  const webhookResearch = new WebhookResearchWorkflow();

  WorkflowRegistry.register(builtinResearch, true); // Set as default
  if (webhookResearch.isAvailable()) {
    WorkflowRegistry.register(webhookResearch);
    // If webhook is available, make it the default
    WorkflowRegistry.setDefault('research', 'webhook');
    logger.info('Webhook research workflow is available and set as default');
  }

  // Metadata workflow
  WorkflowRegistry.register(new BuiltinMetadataWorkflow(), true);

  // Content workflow
  WorkflowRegistry.register(new BuiltinContentWorkflow(), true);

  // Image workflow
  WorkflowRegistry.register(new BuiltinImageWorkflow(), true);

  // Bulk workflow
  WorkflowRegistry.register(new BuiltinBulkWorkflow(), true);

  // Task workflow
  WorkflowRegistry.register(new BuiltinTaskWorkflow(), true);

  // Log stats
  const stats = WorkflowRegistry.getStats();
  logger.info('Workflow registration complete:', stats);
}

// Auto-initialize on module load
initializeWorkflows();
