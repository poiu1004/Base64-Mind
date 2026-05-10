import type { JudgmentCard, GraphNode, GraphEdge, MultimodalSignal } from "./types";

export function computeNeuronStrength(
  card: JudgmentCard,
  existingNode?: GraphNode,
  signals?: MultimodalSignal[]
): number {
  let score = card.strength;
  score += card.sourceCount * 0.1;
  if (card.recency === "high") score += 0.1;
  if (existingNode?.userPinned) score += 0.2;
  if (existingNode?.userRejected) score -= 0.5;
  return Math.min(Math.max(score, 0), 1);
}

export function computeEdgeStrength(
  sourceNode: GraphNode,
  targetNode: GraphNode,
  cards: JudgmentCard[],
  existingEdge?: GraphEdge
): number {
  let score = ((sourceNode.strength + targetNode.strength) / 2) * 0.5;
  
  const sharedCardsCount = cards.filter(
    (c) =>
      sourceNode.sourceCardIds.includes(c.id) &&
      targetNode.sourceCardIds.includes(c.id)
  ).length;
  
  score += sharedCardsCount * 0.1;
  
  if (existingEdge) {
    if (existingEdge.userFeedback === "weakened") {
      score *= 0.35;
    } else if (existingEdge.userFeedback === "removed") {
      score *= 0.05;
    } else if (existingEdge.userFeedback === "confirmed") {
      score += 0.15;
    }
  }

  return Math.min(Math.max(score, 0), 1);
}

export function shouldPromoteToNeuron(score: number, confidence: number): boolean {
  return score >= 0.25 && confidence >= 0.35;
}

export function applyFeedback(edge: GraphEdge, action: "weaken" | "remove" | "confirm"): GraphEdge {
  const newEdge = { ...edge };
  if (action === "remove") {
    newEdge.strength = 0.05;
    newEdge.userFeedback = "removed";
  } else if (action === "weaken") {
    newEdge.strength *= 0.35;
    newEdge.userFeedback = "weakened";
  } else if (action === "confirm") {
    newEdge.strength = Math.min(newEdge.strength + 0.15, 1.0);
    newEdge.userFeedback = "confirmed";
  }
  return newEdge;
}