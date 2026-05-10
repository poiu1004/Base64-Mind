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

export function getAdapter(): AgentAdapter {
  // Use local heuristic for MVP to avoid needing API keys
  return localHeuristicAdapter;
}