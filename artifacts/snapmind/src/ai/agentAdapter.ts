import type { AgentProfile, JudgmentCard, GraphNode, GraphEdge, FeedbackEvent } from '../domain/types';
import { localHeuristicAdapter } from './localHeuristicAdapter';
import { apiAdapter } from './apiAdapter';

export interface AgentAdapter {
  generateReply(
    userMessage: string,
    profile: AgentProfile,
    cards: JudgmentCard[],
    nodes: GraphNode[],
    edges: GraphEdge[],
    feedbackEvents: FeedbackEvent[]
  ): Promise<string>;
}

// API-assisted is primary. localHeuristicAdapter is fallback only.
export function getAdapter(): AgentAdapter {
  return apiAdapter;
}
