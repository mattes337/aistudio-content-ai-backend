import {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
  setRequestModelConfig,
  clearRequestModelConfig,
  setRequestNotebookId,
  clearRequestNotebookId,
} from './openNotebook';
import { webSearchTool, webSearchMultipleTool, isWebSearchAvailable } from './webSearch';

// Tool registry for agent mode (basic tools)
export const agentTools = {
  searchKnowledge: searchKnowledgeTool,
  askKnowledge: askKnowledgeTool,
};

// Tool registry for research mode (all tools for multi-stage retrieval)
export const researchTools = {
  searchKnowledge: searchKnowledgeTool,
  askKnowledge: askKnowledgeTool,
  chatWithNotebook: chatWithNotebookTool,
  buildContext: buildContextTool,
  searchMultiple: searchMultipleTool,
};

// Tool registry for research mode with web search enabled
export const researchToolsWithWeb = {
  ...researchTools,
  webSearch: webSearchTool,
  webSearchMultiple: webSearchMultipleTool,
};

/**
 * Get the appropriate tool set for research based on options
 */
export function getResearchTools(options: { searchWeb?: boolean } = {}) {
  if (options.searchWeb && isWebSearchAvailable()) {
    return researchToolsWithWeb;
  }
  return researchTools;
}

export {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
  webSearchTool,
  webSearchMultipleTool,
  isWebSearchAvailable,
  setRequestModelConfig,
  clearRequestModelConfig,
  setRequestNotebookId,
  clearRequestNotebookId,
};
