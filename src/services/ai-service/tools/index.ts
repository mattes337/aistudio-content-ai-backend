import { searchKnowledgeTool, askKnowledgeTool } from './openNotebook';

// Tool registry for agent mode
export const agentTools = {
  searchKnowledge: searchKnowledgeTool,
  askKnowledge: askKnowledgeTool,
};

// Tool registry for research mode (all tools)
export const researchTools = {
  ...agentTools,
};

export { searchKnowledgeTool, askKnowledgeTool };
