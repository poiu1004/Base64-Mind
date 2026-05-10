import type { GraphNode, GraphEdge, JudgmentCard } from "./types";

export const VALID_NODE_TYPES = [
  "Interest", "Aesthetic", "Idea", "Project", "Place",
  "Product", "Moment", "Evidence", "Task", "Need"
] as const;

export const VALID_EDGE_TYPES = [
  "similar", "inspires", "part_of", "supports_project",
  "reminds_of", "needs_action", "expresses_aesthetic"
] as const;

export function canConnect(
  sourceType: typeof VALID_NODE_TYPES[number],
  targetType: typeof VALID_NODE_TYPES[number],
  edgeType: typeof VALID_EDGE_TYPES[number]
): boolean {
  // Simple heuristic or relaxed constraints for MVP
  return true; 
}

export function inferEdgeType(
  sourceNode: GraphNode,
  targetNode: GraphNode,
  sharedCards: JudgmentCard[]
): typeof VALID_EDGE_TYPES[number] | null {
  if (sharedCards.some(c => c.type === "project_signal")) return "supports_project";
  if (sharedCards.some(c => c.type === "aesthetic_reference")) return "expresses_aesthetic";
  if (sharedCards.some(c => c.type === "memory_moment")) return "reminds_of";
  return "similar";
}

export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function makeNodeId(normalizedLabel: string, nodeType: string): string {
  return `node:${nodeType}:${normalizedLabel}`;
}

export function makeEdgeId(sourceNodeId: string, targetNodeId: string, edgeType: string): string {
  const [a, b] = [sourceNodeId, targetNodeId].sort();
  return `edge:${edgeType}:${a}::${b}`;
}