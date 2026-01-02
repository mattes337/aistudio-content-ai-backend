/**
 * Workflow Registry
 *
 * Central registry for all AI workflows. Allows dynamic registration
 * and retrieval of workflow implementations.
 */

import type {
  WorkflowType,
  AnyWorkflow,
  WorkflowByType,
  ResearchWorkflow,
  MetadataWorkflow,
  ContentWorkflow,
  ImageWorkflow,
  BulkWorkflow,
  TaskWorkflow,
} from './types';
import logger from '../../../utils/logger';

/**
 * Registry for AI workflows
 */
class WorkflowRegistryImpl {
  private workflows: Map<string, AnyWorkflow> = new Map();
  private defaultWorkflows: Map<WorkflowType, string> = new Map();

  /**
   * Register a workflow implementation
   */
  register<T extends AnyWorkflow>(workflow: T, setAsDefault = false): void {
    const key = this.makeKey(workflow.type, workflow.id);

    if (this.workflows.has(key)) {
      logger.warn(`Workflow already registered: ${key}, overwriting`);
    }

    this.workflows.set(key, workflow);
    logger.info(`Registered workflow: ${key} (${workflow.name})`);

    // Set as default if requested or if it's the first of its type
    if (setAsDefault || !this.defaultWorkflows.has(workflow.type)) {
      this.defaultWorkflows.set(workflow.type, workflow.id);
      logger.info(`Set default ${workflow.type} workflow: ${workflow.id}`);
    }
  }

  /**
   * Get a specific workflow by type and ID
   */
  get<T extends WorkflowType>(type: T, id: string): WorkflowByType<T> | undefined {
    const key = this.makeKey(type, id);
    return this.workflows.get(key) as WorkflowByType<T> | undefined;
  }

  /**
   * Get the default workflow for a type
   */
  getDefault<T extends WorkflowType>(type: T): WorkflowByType<T> | undefined {
    const defaultId = this.defaultWorkflows.get(type);
    if (!defaultId) return undefined;
    return this.get(type, defaultId);
  }

  /**
   * Get the first available workflow of a type
   * Useful when you want to use any available implementation
   */
  getAvailable<T extends WorkflowType>(type: T): WorkflowByType<T> | undefined {
    // First try the default
    const defaultWorkflow = this.getDefault(type);
    if (defaultWorkflow?.isAvailable()) {
      return defaultWorkflow;
    }

    // Otherwise find any available workflow of this type
    for (const [key, workflow] of this.workflows) {
      if (key.startsWith(`${type}:`) && workflow.isAvailable()) {
        return workflow as WorkflowByType<T>;
      }
    }

    return undefined;
  }

  /**
   * Set the default workflow for a type
   */
  setDefault(type: WorkflowType, id: string): boolean {
    const key = this.makeKey(type, id);
    if (!this.workflows.has(key)) {
      logger.warn(`Cannot set default: workflow not found: ${key}`);
      return false;
    }
    this.defaultWorkflows.set(type, id);
    logger.info(`Set default ${type} workflow: ${id}`);
    return true;
  }

  /**
   * Get all workflows of a specific type
   */
  getAllOfType<T extends WorkflowType>(type: T): WorkflowByType<T>[] {
    const result: WorkflowByType<T>[] = [];
    for (const [key, workflow] of this.workflows) {
      if (key.startsWith(`${type}:`)) {
        result.push(workflow as WorkflowByType<T>);
      }
    }
    return result;
  }

  /**
   * Get all registered workflows
   */
  getAll(): AnyWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Check if a workflow exists
   */
  has(type: WorkflowType, id: string): boolean {
    return this.workflows.has(this.makeKey(type, id));
  }

  /**
   * Unregister a workflow
   */
  unregister(type: WorkflowType, id: string): boolean {
    const key = this.makeKey(type, id);
    const existed = this.workflows.delete(key);

    if (existed && this.defaultWorkflows.get(type) === id) {
      this.defaultWorkflows.delete(type);
      // Try to set another workflow as default
      for (const [k, workflow] of this.workflows) {
        if (k.startsWith(`${type}:`)) {
          this.defaultWorkflows.set(type, workflow.id);
          break;
        }
      }
    }

    return existed;
  }

  /**
   * Clear all registered workflows
   */
  clear(): void {
    this.workflows.clear();
    this.defaultWorkflows.clear();
  }

  /**
   * Get registry stats
   */
  getStats(): Record<WorkflowType, { count: number; default: string | undefined; available: number }> {
    const types: WorkflowType[] = ['research', 'metadata', 'content', 'image', 'bulk', 'task'];
    const stats: Record<string, { count: number; default: string | undefined; available: number }> = {};

    for (const type of types) {
      const workflows = this.getAllOfType(type);
      stats[type] = {
        count: workflows.length,
        default: this.defaultWorkflows.get(type),
        available: workflows.filter(w => w.isAvailable()).length,
      };
    }

    return stats as Record<WorkflowType, { count: number; default: string | undefined; available: number }>;
  }

  private makeKey(type: WorkflowType, id: string): string {
    return `${type}:${id}`;
  }
}

// Singleton instance
export const WorkflowRegistry = new WorkflowRegistryImpl();

// Type-safe helper functions for each workflow type
export function getResearchWorkflow(id?: string): ResearchWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('research', id)
    : WorkflowRegistry.getAvailable('research');
}

export function getMetadataWorkflow(id?: string): MetadataWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('metadata', id)
    : WorkflowRegistry.getAvailable('metadata');
}

export function getContentWorkflow(id?: string): ContentWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('content', id)
    : WorkflowRegistry.getAvailable('content');
}

export function getImageWorkflow(id?: string): ImageWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('image', id)
    : WorkflowRegistry.getAvailable('image');
}

export function getBulkWorkflow(id?: string): BulkWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('bulk', id)
    : WorkflowRegistry.getAvailable('bulk');
}

export function getTaskWorkflow(id?: string): TaskWorkflow | undefined {
  return id
    ? WorkflowRegistry.get('task', id)
    : WorkflowRegistry.getAvailable('task');
}
