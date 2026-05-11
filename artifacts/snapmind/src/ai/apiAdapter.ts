import type { AgentAdapter } from './agentAdapter';
import { localHeuristicAdapter } from './localHeuristicAdapter';
import type { JudgmentCard, GraphNode, GraphEdge, FeedbackEvent } from '../domain/types';

// ---------------------------------------------------------------------------
// Build structured context from graph data for the API
// ---------------------------------------------------------------------------

function buildChatContext(
  cards: JudgmentCard[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  feedbackEvents: FeedbackEvent[]
) {
  // Compute feedback-adjusted node weights
  const weights = new Map<string, number>(nodes.map(n => [n.id, n.strength]));
  for (const ev of feedbackEvents) {
    if (ev.targetType !== 'edge') continue;
    const edge = edges.find(e => e.id === ev.targetId);
    if (!edge) continue;
    const factor = ev.action === 'remove' ? 0.05 : ev.action === 'weaken' ? 0.35 : 1;
    const wA = weights.get(edge.sourceNodeId) ?? 0;
    const wB = weights.get(edge.targetNodeId) ?? 0;
    weights.set(edge.sourceNodeId, wA * factor);
    weights.set(edge.targetNodeId, wB * factor);
  }

  const topNodes = nodes
    .filter(n => !n.userRejected && (weights.get(n.id) ?? 0) > 0.05)
    .sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0))
    .slice(0, 8)
    .map(n => ({ label: n.label, nodeType: n.nodeType, strength: weights.get(n.id) ?? n.strength }));

  const topCards = cards
    .filter(c => !c.userRejected)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map(c => ({ description: c.description, strength: c.strength }));

  const nodeIdSet = new Set(topNodes.map(n => {
    const full = nodes.find(node => node.label === n.label);
    return full?.id;
  }).filter(Boolean));

  const topEdges = edges
    .filter(e =>
      e.userFeedback !== 'removed' &&
      e.strength > 0.2 &&
      nodeIdSet.has(e.sourceNodeId) &&
      nodeIdSet.has(e.targetNodeId)
    )
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map(e => {
      const src = nodes.find(n => n.id === e.sourceNodeId);
      const tgt = nodes.find(n => n.id === e.targetNodeId);
      return {
        sourceLabel: src?.label ?? e.sourceNodeId,
        targetLabel: tgt?.label ?? e.targetNodeId,
        strength: e.strength,
      };
    });

  // Extract recent visual captions from cards with image-derived descriptions
  const recentVisualCaptions = cards
    .filter(c => c.type === 'aesthetic_reference' && !c.userRejected)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map(c => c.description);

  return { topNodes, topCards, topEdges, recentVisualCaptions };
}

async function callChatApi(
  userMessage: string,
  formationStage: string,
  dominantSignals: string[],
  context: ReturnType<typeof buildChatContext>
): Promise<string | null> {
  try {
    const res = await fetch('/api/understand/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        context: {
          formationStage,
          dominantSignals,
          topCards: context.topCards,
          topNodes: context.topNodes,
          topEdges: context.topEdges,
          recentVisualCaptions: context.recentVisualCaptions,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; reply?: string };
    return data.success && data.reply ? data.reply : null;
  } catch {
    return null;
  }
}

export const apiAdapter: AgentAdapter = {
  async generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents) {
    // Empty profile — no need to call API
    if (profile.formationStage === 'empty') {
      return '안녕해. 뭔가 저장하면 내가 형성돼. 텍스트, 이미지, 파일 뭐든 넣어봐.';
    }

    const ctx = buildChatContext(cards, nodes, edges, feedbackEvents);

    const reply = await callChatApi(
      userMessage,
      profile.formationStage,
      profile.dominantSignals,
      ctx
    );

    if (reply) return reply;

    // API failed → fall back to local heuristic
    return localHeuristicAdapter.generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents);
  },
};
