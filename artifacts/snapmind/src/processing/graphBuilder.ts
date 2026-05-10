import type { JudgmentCard, GraphNode, GraphEdge } from '../domain/types';
import { computeNeuronStrength, computeEdgeStrength, shouldPromoteToNeuron } from '../domain/scoring';
import { makeNodeId, makeEdgeId, normalizeLabel, inferEdgeType } from '../domain/graph';

export function buildGraph(
  cards: JudgmentCard[],
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[]
): { nodes: GraphNode[], edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const now = new Date().toISOString();

  // Create Nodes
  for (const card of cards) {
    const score = computeNeuronStrength(card, existingNodes.find(n => n.sourceCardIds.includes(card.id)));
    if (shouldPromoteToNeuron(score, card.confidence)) {
      const label = normalizeLabel(card.signal);
      const nodeType = card.type === "aesthetic_reference" ? "Aesthetic" : 
                       card.type === "project_signal" ? "Project" : "Interest";
      const id = makeNodeId(label, nodeType);
      
      const existing = existingNodes.find(n => n.id === id);
      nodes.push({
        id,
        label: card.signal,
        nodeType,
        strength: score,
        confidence: card.confidence,
        sourceCardIds: existing ? [...new Set([...existing.sourceCardIds, card.id])] : [card.id],
        userPinned: existing ? existing.userPinned : false,
        userRejected: existing ? existing.userRejected : false,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now
      });
    }
  }

  // Create Edges
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];
      const sharedCards = cards.filter(c => source.sourceCardIds.includes(c.id) && target.sourceCardIds.includes(c.id));
      
      if (sharedCards.length > 0) {
        const edgeType = inferEdgeType(source, target, sharedCards) || "similar";
        const id = makeEdgeId(source.id, target.id, edgeType);
        const existing = existingEdges.find(e => e.id === id);
        
        const strength = computeEdgeStrength(source, target, cards, existing);
        if (strength > 0.1) {
          edges.push({
            id,
            sourceNodeId: source.id,
            targetNodeId: target.id,
            edgeType,
            strength,
            confidence: (source.confidence + target.confidence) / 2,
            sourceCardIds: sharedCards.map(c => c.id),
            userFeedback: existing ? existing.userFeedback : "none",
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function recomputeGraph(
  remainingCards: JudgmentCard[],
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[]
): { nodes: GraphNode[], edges: GraphEdge[] } {
  // Simplified recomputation for MVP
  return buildGraph(remainingCards, existingNodes, existingEdges);
}