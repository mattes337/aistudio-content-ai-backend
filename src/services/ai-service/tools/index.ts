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
import {
  createArticleDraftTool,
  createPostDraftTool,
  createMediaDraftTool,
  intentTools,
} from './intentTools';

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

// Tool registry for research mode with intent (content creation) tools
export const researchToolsWithIntent = {
  ...researchTools,
  ...intentTools,
};

// Tool registry for research mode with both web search and intent tools
export const researchToolsWithWebAndIntent = {
  ...researchTools,
  webSearch: webSearchTool,
  webSearchMultiple: webSearchMultipleTool,
  ...intentTools,
};

/**
 * Get the appropriate tool set for research based on options
 */
export function getResearchTools(options: { searchWeb?: boolean; enableIntentTools?: boolean } = {}) {
  const hasWebSearch = options.searchWeb && isWebSearchAvailable();
  const hasIntentTools = options.enableIntentTools;

  if (hasWebSearch && hasIntentTools) {
    return researchToolsWithWebAndIntent;
  }
  if (hasWebSearch) {
    return researchToolsWithWeb;
  }
  if (hasIntentTools) {
    return researchToolsWithIntent;
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
  // Intent tools
  createArticleDraftTool,
  createPostDraftTool,
  createMediaDraftTool,
  intentTools,
};
