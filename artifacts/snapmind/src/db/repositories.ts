import { db } from './dexie';
import type { RawItem, MultimodalSignal, JudgmentCard, GraphNode, GraphEdge, FeedbackEvent, ChatMessage, AgentProfile } from '../domain/types';

export const rawItemRepo = {
  create: async (item: RawItem) => {
    await db.rawItems.add(item);
    return item;
  },
  getById: async (id: string) => db.rawItems.get(id),
  getAll: async () => db.rawItems.orderBy('createdAt').reverse().toArray(),
  updateStatus: async (id: string, status: RawItem["processingStatus"]) => {
    await db.rawItems.update(id, { processingStatus: status });
    return db.rawItems.get(id);
  },
  remove: async (id: string) => {
    await db.rawItems.delete(id);
  }
};

export const blobRepo = {
  save: async (id: string, blob: Blob) => {
    await db.blobs.put({ id, data: blob });
  },
  getById: async (id: string) => {
    const record = await db.blobs.get(id);
    return record?.data;
  },
  remove: async (id: string) => {
    await db.blobs.delete(id);
  }
};

export const signalRepo = {
  create: async (signal: MultimodalSignal) => {
    await db.signals.add(signal);
    return signal;
  },
  getByItemId: async (itemId: string) => db.signals.where({ itemId }).toArray(),
  removeByItemId: async (itemId: string) => {
    await db.signals.where({ itemId }).delete();
  }
};

export const cardRepo = {
  create: async (card: JudgmentCard) => {
    await db.judgmentCards.add(card);
    return card;
  },
  upsert: async (card: JudgmentCard) => {
    await db.judgmentCards.put(card);
    return card;
  },
  getAll: async () => db.judgmentCards.toArray(),
  getByIds: async (ids: string[]) => db.judgmentCards.where('id').anyOf(ids).toArray(),
  getHighStrength: async (minStrength: number) => db.judgmentCards.where('strength').aboveOrEqual(minStrength).toArray(),
  removeBySourceItem: async (itemId: string) => {
    const all = await db.judgmentCards.toArray();
    const toUpdate = [];
    const toDelete = [];
    for (const card of all) {
      if (card.sourceItemIds.includes(itemId)) {
        const newIds = card.sourceItemIds.filter(id => id !== itemId);
        if (newIds.length === 0) {
          toDelete.push(card.id);
        } else {
          toUpdate.push({ ...card, sourceItemIds: newIds, sourceCount: newIds.length });
        }
      }
    }
    await db.judgmentCards.bulkDelete(toDelete);
    await db.judgmentCards.bulkPut(toUpdate);
  },
  updateSourceItemIds: async (cardId: string, newSourceItemIds: string[]) => {
    const card = await db.judgmentCards.get(cardId);
    if (!card) return null;
    const updated = { ...card, sourceItemIds: newSourceItemIds, sourceCount: newSourceItemIds.length };
    await db.judgmentCards.put(updated);
    return updated;
  }
};

export const nodeRepo = {
  create: async (node: GraphNode) => {
    await db.graphNodes.add(node);
    return node;
  },
  upsert: async (node: GraphNode) => {
    await db.graphNodes.put(node);
    return node;
  },
  getAll: async () => db.graphNodes.toArray(),
  getById: async (id: string) => db.graphNodes.get(id),
  updateStrength: async (id: string, strength: number) => {
    await db.graphNodes.update(id, { strength });
  },
  remove: async (id: string) => {
    await db.graphNodes.delete(id);
  }
};

export const edgeRepo = {
  create: async (edge: GraphEdge) => {
    await db.graphEdges.add(edge);
    return edge;
  },
  upsert: async (edge: GraphEdge) => {
    await db.graphEdges.put(edge);
    return edge;
  },
  getAll: async () => db.graphEdges.toArray(),
  getByNodeId: async (nodeId: string) => {
    const all = await db.graphEdges.toArray();
    return all.filter(e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
  },
  updateFeedback: async (id: string, feedback: GraphEdge["userFeedback"], strength: number) => {
    await db.graphEdges.update(id, { userFeedback: feedback, strength });
  },
  remove: async (id: string) => {
    await db.graphEdges.delete(id);
  }
};

export const feedbackRepo = {
  create: async (event: FeedbackEvent) => {
    await db.feedbackEvents.add(event);
    return event;
  },
  getAll: async () => db.feedbackEvents.toArray()
};

export const chatRepo = {
  create: async (msg: ChatMessage) => {
    await db.chatMessages.add(msg);
    return msg;
  },
  getRecent: async (limit: number) => db.chatMessages.orderBy('createdAt').reverse().limit(limit).toArray().then(arr => arr.reverse()),
  getAll: async () => db.chatMessages.orderBy('createdAt').toArray()
};

export const profileRepo = {
  get: async () => db.agentProfiles.get('local-agent'),
  upsert: async (profile: AgentProfile) => {
    await db.agentProfiles.put(profile);
    return profile;
  }
};