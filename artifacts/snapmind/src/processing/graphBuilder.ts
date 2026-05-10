import type { JudgmentCard, GraphNode, GraphEdge } from '../domain/types';
import { computeNeuronStrength, computeEdgeStrength, shouldPromoteToNeuron } from '../domain/scoring';
import { makeNodeId, makeEdgeId, normalizeLabel, inferEdgeType } from '../domain/graph';

// ---------------------------------------------------------------------------
// Semantic similarity heuristic — connects related concepts
// ---------------------------------------------------------------------------

const SEMANTIC_PAIRS: [string, string][] = [
  ['hologram', 'neon-blue'],
  ['hologram', 'neon'],
  ['hologram', 'holographic'],
  ['holographic', 'neon'],
  ['holographic', 'depth'],
  ['constellation', 'network'],
  ['constellation', 'brain'],
  ['constellation', 'connection'],
  ['network', 'connection'],
  ['network', 'depth'],
  ['brain', 'neuron'],
  ['brain', 'knowledge'],
  ['brain', 'memory'],
  ['neuron', 'network'],
  ['neuron', 'connection'],
  ['agent', 'local'],
  ['agent', 'privacy'],
  ['agent', 'memory'],
  ['privacy', 'local'],
  ['privacy', 'local-first'],
  ['local', 'local-first'],
  ['local', 'memory'],
  ['memory', 'knowledge'],
  ['minimal', 'quiet'],
  ['minimal', 'clarity'],
  ['minimal', 'clean'],
  ['worldview', 'knowledge'],
  ['worldview', 'agent'],
  ['design', 'minimal'],
  ['design', 'depth'],
  ['dark', 'depth'],
  ['dark', 'contrast'],
  ['neon', 'contrast'],
  ['teal', 'holographic'],
  ['layered', 'depth'],
  ['layered', 'complex'],
  ['futuristic', 'holographic'],
  ['futuristic', 'neon'],
  ['cool-tone', 'minimal'],
  ['cool-tone', 'depth'],
];

function areSemanticallyRelated(labelA: string, labelB: string): boolean {
  const a = labelA.toLowerCase(), b = labelB.toLowerCase();
  return SEMANTIC_PAIRS.some(([x, y]) =>
    (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))
  );
}

// ---------------------------------------------------------------------------
// Get all sourceItemIds referenced by a node (through its source cards)
// ---------------------------------------------------------------------------

function getSourceItemIds(node: GraphNode, allCards: JudgmentCard[]): string[] {
  const nodeCards = allCards.filter(c => node.sourceCardIds.includes(c.id));
  return [...new Set(nodeCards.flatMap(c => c.sourceItemIds))];
}

// ---------------------------------------------------------------------------
// Card → nodeType mapping
// ---------------------------------------------------------------------------

function cardTypeToNodeType(cardType: JudgmentCard['type']): GraphNode['nodeType'] {
  switch (cardType) {
    case 'aesthetic_reference': return 'Aesthetic';
    case 'project_signal':      return 'Project';
    case 'idea_seed':           return 'Idea';
    case 'memory_moment':       return 'Moment';
    case 'evidence_record':     return 'Evidence';
    case 'need_signal':         return 'Need';
    default:                    return 'Interest';
  }
}

// ---------------------------------------------------------------------------
// buildGraph — called on each new item
// ---------------------------------------------------------------------------

export function buildGraph(
  cards: JudgmentCard[],
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const now = new Date().toISOString();

  // ── Build / update nodes ─────────────────────────────────────────────
  const nodeMap = new Map<string, GraphNode>();

  // Seed with existing nodes so we can update them
  for (const n of existingNodes) {
    nodeMap.set(n.id, { ...n });
  }

  for (const card of cards) {
    const label = normalizeLabel(card.signal);
    const nodeType = cardTypeToNodeType(card.type);
    const nodeId = makeNodeId(label, nodeType);
    const existing = nodeMap.get(nodeId);

    const score = computeNeuronStrength(card, existing);
    if (!shouldPromoteToNeuron(score, card.confidence)) continue;

    const merged: GraphNode = {
      id: nodeId,
      label: card.signal,
      nodeType,
      strength: score,
      confidence: card.confidence,
      sourceCardIds: existing
        ? [...new Set([...existing.sourceCardIds, card.id])]
        : [card.id],
      userPinned: existing?.userPinned ?? false,
      userRejected: existing?.userRejected ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    nodeMap.set(nodeId, merged);
  }

  const nodes = [...nodeMap.values()];

  // ── Build / update edges ─────────────────────────────────────────────
  const edgeMap = new Map<string, GraphEdge>();

  // Seed with existing edges (preserving userFeedback)
  for (const e of existingEdges) {
    edgeMap.set(e.id, { ...e });
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];

      // Skip if either node is user-rejected
      if (source.userRejected || target.userRejected) continue;

      // ── Connection criteria ──────────────────────────────────────
      // 1. Shared cards (same signal on multiple items)
      const sharedCards = cards.filter(
        c => source.sourceCardIds.includes(c.id) && target.sourceCardIds.includes(c.id)
      );

      // 2. Co-occurrence: same RawItem produced both nodes
      const sourceItemsA = getSourceItemIds(source, cards);
      const sourceItemsB = getSourceItemIds(target, cards);
      const sharedItems = sourceItemsA.filter(id => sourceItemsB.includes(id));

      // 3. Semantic similarity heuristic
      const semanticMatch = areSemanticallyRelated(source.label, target.label);

      const shouldConnect = sharedCards.length > 0 || sharedItems.length > 0 || semanticMatch;
      if (!shouldConnect) continue;

      const edgeType = inferEdgeType(source, target, sharedCards) ?? 'similar';
      const edgeId = makeEdgeId(source.id, target.id, edgeType);
      const existing = edgeMap.get(edgeId);

      // Do not revive a user-removed edge above a trace level
      if (existing?.userFeedback === 'removed') {
        // Keep at suppressed strength — do not overwrite userFeedback
        edgeMap.set(edgeId, { ...existing, updatedAt: now });
        continue;
      }

      // Compute strength
      let strength = computeEdgeStrength(source, target, cards, existing);

      // Boost for co-occurrence
      if (sharedItems.length > 0) strength += sharedItems.length * 0.08;
      // Small boost for semantic
      if (semanticMatch) strength += 0.05;
      strength = Math.min(strength, 1.0);

      // Apply feedback cap for weakened edges (don't let them recover to full strength)
      if (existing?.userFeedback === 'weakened') {
        strength = Math.min(strength, 0.3);
      }

      const allSourceCardIds = [
        ...new Set([
          ...sharedCards.map(c => c.id),
          ...(existing?.sourceCardIds ?? []),
        ]),
      ];

      edgeMap.set(edgeId, {
        id: edgeId,
        sourceNodeId: source.id,
        targetNodeId: target.id,
        edgeType,
        strength,
        confidence: (source.confidence + target.confidence) / 2,
        sourceCardIds: allSourceCardIds,
        userFeedback: existing?.userFeedback ?? 'none',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    }
  }

  // Filter out edges where both endpoints no longer exist as nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = [...edgeMap.values()].filter(
    e => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)
  );

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// recomputeGraph — full recompute from remaining cards (e.g. after deletion)
// ---------------------------------------------------------------------------

export function recomputeGraph(
  remainingCards: JudgmentCard[],
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Pass existing nodes/edges to preserve userFeedback and userPinned
  return buildGraph(remainingCards, existingNodes, existingEdges);
}
