import type { AgentAdapter } from './agentAdapter';
import { localHeuristicAdapter } from './localHeuristicAdapter';

export const apiAdapter: AgentAdapter = {
  async generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents) {
    console.warn("API adapter not implemented yet. Falling back to local heuristic.");
    return localHeuristicAdapter.generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents);
  }
};