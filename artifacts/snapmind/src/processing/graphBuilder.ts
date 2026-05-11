import type { JudgmentCard, GraphNode, GraphEdge } from '../domain/types';
import { computeNeuronStrength, computeEdgeStrength, shouldPromoteToNeuron } from '../domain/scoring';
import { makeNodeId, makeEdgeId, normalizeLabel, inferEdgeType } from '../domain/graph';

// ---------------------------------------------------------------------------
// Semantic similarity — Korean + English synonym groups
// ---------------------------------------------------------------------------

const SEMANTIC_PAIRS: [string, string][] = [
  // ── Tech / AI / Privacy ───────────────────────────────────────────────
  ['hologram', 'neon-blue'], ['hologram', 'neon'], ['hologram', 'holographic'],
  ['holographic', 'neon'], ['holographic', 'depth'],
  ['constellation', 'network'], ['constellation', 'brain'], ['constellation', 'connection'],
  ['network', 'connection'], ['network', 'depth'],
  ['brain', 'neuron'], ['brain', 'knowledge'], ['brain', 'memory'],
  ['neuron', 'network'], ['neuron', 'connection'],
  ['agent', 'local'], ['agent', 'privacy'], ['agent', 'memory'],
  ['privacy', 'local'], ['privacy', 'local-first'],
  ['local', 'local-first'], ['local', 'memory'],
  ['memory', 'knowledge'], ['minimal', 'quiet'], ['minimal', 'clarity'], ['minimal', 'clean'],
  ['worldview', 'knowledge'], ['worldview', 'agent'],
  ['design', 'minimal'], ['design', 'depth'], ['design', 'ui'], ['design', 'interface'],
  ['dark', 'depth'], ['dark', 'contrast'],
  ['neon', 'contrast'], ['teal', 'holographic'],
  ['layered', 'depth'], ['layered', 'complex'],
  ['futuristic', 'holographic'], ['futuristic', 'neon'],
  ['cool-tone', 'minimal'], ['cool-tone', 'depth'],

  // ── Cafe / Coffee ─────────────────────────────────────────────────────
  ['카페', '커피'], ['카페', '음료'], ['카페', '여유'],
  ['카페', 'cafe'], ['카페', 'coffee'], ['카페', '카페라테'],
  ['커피', 'coffee'], ['커피', '음료'], ['커피', '카페'],
  ['cafe', 'coffee'], ['cafe', '카페'], ['coffee', '커피'],
  ['카페라테', '커피'], ['아메리카노', '커피'], ['라테', '커피'],
  ['카페', '인테리어'], ['카페', '공간'],

  // ── Food / Eating ─────────────────────────────────────────────────────
  ['음식', '요리'], ['음식', '맛'], ['음식', 'food'],
  ['음식', '카페'], ['요리', 'cooking'], ['food', '음식'],
  ['음식', '식재료'], ['요리', '식재료'], ['음식', '레스토랑'],
  ['레스토랑', 'restaurant'], ['식사', '음식'], ['맛집', '음식'],

  // ── Travel / Landscape ────────────────────────────────────────────────
  ['여행', 'travel'], ['여행', '풍경'], ['여행', '자연'], ['여행', '바다'],
  ['여행', '도시'], ['여행', '사진'], ['travel', '여행'],
  ['풍경', '자연'], ['풍경', '사진'], ['풍경', 'landscape'],
  ['landscape', '풍경'], ['landscape', '자연'],

  // ── Ocean / Beach / Nature ────────────────────────────────────────────
  ['바다', 'ocean'], ['바다', 'sea'], ['바다', '해변'], ['바다', '자연'],
  ['바다', '파랑'], ['바다', 'blue'], ['바다', '물'],
  ['ocean', '바다'], ['ocean', 'sea'], ['ocean', 'beach'],
  ['sea', '바다'], ['beach', '해변'], ['해변', '바다'],
  ['자연', 'nature'], ['자연', '녹색'], ['자연', '식물'],
  ['nature', '자연'], ['nature', 'natural'],
  ['숲', '자연'], ['숲', '녹색'], ['녹색', 'green'],
  ['꽃', 'flower'], ['꽃', '자연'], ['flower', '꽃'],
  ['식물', '자연'], ['식물', 'plant'],

  // ── City / Architecture ───────────────────────────────────────────────
  ['도시', 'city'], ['도시', 'urban'], ['도시', '건축'],
  ['도시', '거리'], ['도시', '빌딩'],
  ['city', '도시'], ['urban', '도시'],
  ['건축', 'architecture'], ['건축', '건물'], ['건축', '공간'],
  ['architecture', '건축'], ['건물', '건축'],
  ['거리', 'street'], ['거리', '도시'],
  ['빌딩', '도시'], ['빌딩', '건축'],

  // ── Fashion / Style ───────────────────────────────────────────────────
  ['패션', 'fashion'], ['패션', '스타일'], ['패션', '옷'],
  ['fashion', '패션'], ['스타일', '패션'], ['스타일', 'style'],
  ['스타일', '디자인'], ['옷', '패션'],
  ['코디', '패션'], ['코디', '스타일'],
  ['빈티지', 'vintage'], ['빈티지', '레트로'], ['레트로', 'retro'],
  ['모던', 'modern'], ['미니멀', 'minimal'],

  // ── Interior / Space ──────────────────────────────────────────────────
  ['인테리어', 'interior'], ['인테리어', '공간'], ['인테리어', '디자인'],
  ['interior', '인테리어'], ['공간', '인테리어'], ['공간', 'space'],
  ['가구', '인테리어'], ['홈', '인테리어'],

  // ── People / Emotion ─────────────────────────────────────────────────
  ['사람', 'person'], ['사람', 'people'], ['사람', '인물'],
  ['인물', 'portrait'], ['인물', '사람'],
  ['감정', 'emotion'], ['감정', '표정'], ['표정', '인물'],
  ['웃음', '사람'], ['행복', '감정'],

  // ── Art / Creativity ─────────────────────────────────────────────────
  ['예술', 'art'], ['예술', '창의성'], ['예술', '감각'],
  ['art', '예술'], ['그림', '예술'], ['그림', 'painting'],
  ['일러스트', 'illustration'], ['사진', 'photo'], ['사진', '풍경'],

  // ── UI / Technology ───────────────────────────────────────────────────
  ['ui', 'interface'], ['ui', 'ux'], ['ui', 'design'],
  ['interface', 'ui'], ['ux', 'ui'],
  ['앱', 'app'], ['앱', 'ui'], ['소프트웨어', 'software'],
  ['개발', 'development'], ['개발', '코드'], ['코드', 'code'],
  ['기술', 'technology'], ['기술', '개발'],
  ['스크린샷', 'screenshot'], ['스크린샷', 'ui'], ['스크린샷', '앱'],
  ['다크모드', 'dark mode'], ['다크모드', 'dark'], ['다크모드', 'ui'],

  // ── Animals ───────────────────────────────────────────────────────────
  ['동물', 'animal'], ['동물', '자연'], ['고양이', 'cat'],
  ['강아지', 'dog'], ['고양이', '동물'], ['강아지', '동물'],

  // ── Mood ──────────────────────────────────────────────────────────────
  ['평화', 'peaceful'], ['평화', 'calm'], ['평화', '자연'],
  ['활기찬', 'energetic'], ['활기찬', 'vibrant'], ['활기찬', 'energy'],
  ['아늑한', 'cozy'], ['아늑한', '따뜻한'], ['따뜻한', 'warm'],
  ['몽환적인', 'dreamy'], ['몽환적인', 'mystical'],
];

// ---------------------------------------------------------------------------
// Semantic matching with substring search on both raw and normalized labels
// ---------------------------------------------------------------------------

function normalizeForSemantics(label: string): string {
  return label.toLowerCase()
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSemanticallyRelated(labelA: string, labelB: string): boolean {
  const a = normalizeForSemantics(labelA);
  const b = normalizeForSemantics(labelB);
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

  for (const n of existingNodes) {
    nodeMap.set(n.id, { ...n });
  }

  for (const card of cards) {
    const label = normalizeLabel(card.signal);
    const nodeType = cardTypeToNodeType(card.type);

    // Skip long caption-style strings as nodes — they are descriptions, not keywords
    // (visual_caption evidence records with full sentences shouldn't become graph neurons)
    if (card.signal.length > 30 && nodeType === 'Evidence') continue;

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

  for (const e of existingEdges) {
    edgeMap.set(e.id, { ...e });
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];

      if (source.userRejected || target.userRejected) continue;

      // 1. Shared cards
      const sharedCards = cards.filter(
        c => source.sourceCardIds.includes(c.id) && target.sourceCardIds.includes(c.id)
      );

      // 2. Co-occurrence: same RawItem produced both nodes
      const sourceItemsA = getSourceItemIds(source, cards);
      const sourceItemsB = getSourceItemIds(target, cards);
      const sharedItems = sourceItemsA.filter(id => sourceItemsB.includes(id));

      // 3. Semantic similarity (Korean + English)
      const semanticMatch = areSemanticallyRelated(source.label, target.label);

      const shouldConnect = sharedCards.length > 0 || sharedItems.length > 0 || semanticMatch;
      if (!shouldConnect) continue;

      const edgeType = inferEdgeType(source, target, sharedCards) ?? 'similar';
      const edgeId = makeEdgeId(source.id, target.id, edgeType);
      const existing = edgeMap.get(edgeId);

      if (existing?.userFeedback === 'removed') {
        edgeMap.set(edgeId, { ...existing, updatedAt: now });
        continue;
      }

      let strength = computeEdgeStrength(source, target, cards, existing);
      if (sharedItems.length > 0) strength += sharedItems.length * 0.1;
      if (semanticMatch) strength += 0.06;
      strength = Math.min(strength, 1.0);

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
  return buildGraph(remainingCards, existingNodes, existingEdges);
}
