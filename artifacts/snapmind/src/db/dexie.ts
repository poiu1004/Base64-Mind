import Dexie from 'dexie';
import type { RawItem, MultimodalSignal, JudgmentCard, GraphNode, GraphEdge, FeedbackEvent, ChatMessage, AgentProfile } from '../domain/types';

export class SnapMindDB extends Dexie {
  rawItems!: Dexie.Table<RawItem, string>;
  blobs!: Dexie.Table<{ id: string; data: Blob }, string>;
  signals!: Dexie.Table<MultimodalSignal, string>;
  judgmentCards!: Dexie.Table<JudgmentCard, string>;
  graphNodes!: Dexie.Table<GraphNode, string>;
  graphEdges!: Dexie.Table<GraphEdge, string>;
  feedbackEvents!: Dexie.Table<FeedbackEvent, string>;
  chatMessages!: Dexie.Table<ChatMessage, string>;
  agentProfiles!: Dexie.Table<AgentProfile, string>;

  constructor() {
    super('SnapMindDB');
    this.version(1).stores({
      rawItems: 'id, createdAt, processingStatus',
      blobs: 'id',
      signals: 'id, itemId',
      judgmentCards: 'id, type, strength',
      graphNodes: 'id, label, nodeType, strength',
      graphEdges: 'id, sourceNodeId, targetNodeId, edgeType',
      feedbackEvents: 'id, targetId',
      chatMessages: 'id, createdAt',
      agentProfiles: 'id',
    });
  }
}

export const db = new SnapMindDB();
