import {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
} from './openNotebook';

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

export {
  searchKnowledgeTool,
  askKnowledgeTool,
  chatWithNotebookTool,
  buildContextTool,
  searchMultipleTool,
};
