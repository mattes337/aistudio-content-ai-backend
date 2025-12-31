import {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
  setRequestModelConfig,
  clearRequestModelConfig,
} from './openNotebook';

// Tool registry for agent mode (basic tools)
// NOTE: askKnowledge disabled due to Open Notebook LangChain parsing bug with Claude responses
export const agentTools = {
  searchKnowledge: searchKnowledgeTool,
  // askKnowledge: askKnowledgeTool, // Disabled: Open Notebook can't parse Claude's response format
};

// Tool registry for research mode (all tools for multi-stage retrieval)
// NOTE: askKnowledge disabled due to Open Notebook LangChain parsing bug with Claude responses
export const researchTools = {
  searchKnowledge: searchKnowledgeTool,
  // askKnowledge: askKnowledgeTool, // Disabled: Open Notebook can't parse Claude's response format
  chatWithNotebook: chatWithNotebookTool,
  buildContext: buildContextTool,
  searchMultiple: searchMultipleTool,
};

export {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
  setRequestModelConfig,
  clearRequestModelConfig,
};
