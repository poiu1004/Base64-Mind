import type { AgentAdapter } from './agentAdapter';
import type { JudgmentCard, GraphNode, GraphEdge, FeedbackEvent } from '../domain/types';

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

type QuestionIntent =
  | 'tastes'       // 내가 좋아하는 게 뭐야, 내 취향
  | 'aesthetics'   // 미적 감각, 비주얼
  | 'interests'    // 관심사, 뭐에 끌려
  | 'projects'     // 뭐 만들고 싶어, 프로젝트
  | 'data'         // 저장한 것들, 데이터
  | 'negative'     // 별로야, 아닌데
  | 'general';

function detectIntent(msg: string): QuestionIntent {
  const m = msg;
  if (/별로|아닌데|그건 아니|틀렸|잘못/.test(m)) return 'negative';
  if (/취향|좋아하는 게|좋아하는 것|좋아해|뭘 좋아/.test(m)) return 'tastes';
  if (/미적|비주얼|시각|색|디자인|예쁜|예뻐/.test(m)) return 'aesthetics';
  if (/끌리|관심|흥미|재밌|좋아 보이/.test(m)) return 'interests';
  if (/만들|프로젝트|작업|개발|하고 싶/.test(m)) return 'projects';
  if (/저장|넣은|쌓은|데이터|자료/.test(m)) return 'data';
  return 'general';
}

// ---------------------------------------------------------------------------
// Keyword → natural-language snippet (short fragments, not full sentences)
// ---------------------------------------------------------------------------

const KEYWORD_SNIPPETS: Record<string, string[]> = {
  hologram:     ['홀로그래픽 레이어에 반복적으로 끌림', '반투명하게 겹치는 인터페이스 미학'],
  holographic:  ['홀로그래픽 비주얼이 반복 등장', '빛이 공간 속에 떠 있는 감각'],
  'neon-blue':  ['차가운 블루 네온 계열 선호', '전기적이고 선명한 디지털 에너지'],
  neon:         ['네온 광채와 강렬한 디지털 색감', '빛나는 인터페이스에 끌리는 경향'],
  constellation:['점과 선으로 연결된 별자리형 구조', '관계가 눈에 보이는 지식 지도'],
  network:      ['연결 구조와 패턴에 집중하는 시각', '개별 요소보다 관계에 끌림'],
  brain:        ['뇌와 인지 구조에 대한 관심', '정보가 연결되는 방식에 끌림'],
  neuron:       ['뉴런 방식의 지식 연결 구조', '신호가 전파되는 방식에 관심'],
  agent:        ['나만의 AI 에이전트 개념 반복', '개인화된 지능 시스템에 대한 생각'],
  privacy:      ['데이터 주권과 프라이버시 강한 관심', '외부로 나가지 않는 신뢰 구조 중시'],
  local:        ['로컬 우선 철학 반복 등장', '내 통제 안에 있는 시스템 선호'],
  'local-first':['로컬 퍼스트 원칙이 핵심 가치로 자리잡음', '클라우드 없는 완결된 구조 선호'],
  memory:       ['기억과 저장 방식에 대한 관심', '무엇을 간직하고 되살릴지에 대한 감각'],
  minimal:      ['군더더기 없는 절제된 미학', '필요한 것만 남긴 인터페이스 선호'],
  quiet:        ['조용하고 집중된 환경을 중요하게 여김', '소음 없이 핵심에 집중하는 감각'],
  worldview:    ['개인 세계관 구체화에 대한 욕구', '내가 보는 방식을 구조로 만들고 싶은 생각'],
  knowledge:    ['지식의 구조화와 연결 방식에 관심', '개념들이 연결되는 방식에 끌림'],
  depth:        ['레이어와 깊이를 가진 시각 구성 선호', '표면 너머의 구조를 보는 감각'],
  layered:      ['겹겹이 쌓인 레이어드 구조에 끌림', '복잡한 관계를 투명하게 드러내는 방식'],
  dark:         ['어두운 배경에 빛이 부각되는 구성 선호', '극적인 대비와 집중감'],
  futuristic:   ['미래적인 비주얼 언어에 끌림', '아직 오지 않은 인터페이스 감각'],
  teal:         ['청록 계열의 미래적이고 날카로운 톤', '차갑고 집중된 색 선호'],
  connection:   ['연결과 관계 자체에 집중', '사이의 공간이 중요한 사고 방식'],
  design:       ['인터페이스 미학과 시각 구성에 관심', '형태가 기능을 담는 방식에 끌림'],
};

function getSnippets(nodeLabel: string, count = 1): string[] {
  const lower = nodeLabel.toLowerCase();
  const key = Object.keys(KEYWORD_SNIPPETS).find(k => lower.includes(k) || k.includes(lower));
  if (key) return KEYWORD_SNIPPETS[key].slice(0, count);
  return [`'${nodeLabel}'에 대한 관심이 반복`];
}

// ---------------------------------------------------------------------------
// Apply feedback to node weights
// ---------------------------------------------------------------------------

function computeNodeWeights(
  nodes: GraphNode[],
  edges: GraphEdge[],
  feedbackEvents: FeedbackEvent[]
): Map<string, number> {
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

  return weights;
}

// ---------------------------------------------------------------------------
// Build a persona-style response from actual graph data
// ---------------------------------------------------------------------------

function buildPersonaResponse(
  intent: QuestionIntent,
  cards: JudgmentCard[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  feedbackEvents: FeedbackEvent[]
): string {
  const weights = computeNodeWeights(nodes, edges, feedbackEvents);

  // Sort nodes by adjusted weight, exclude rejected
  const rankedNodes = nodes
    .filter(n => !n.userRejected)
    .map(n => ({ node: n, weight: weights.get(n.id) ?? 0 }))
    .filter(x => x.weight > 0.05)
    .sort((a, b) => b.weight - a.weight);

  if (rankedNodes.length === 0) {
    return '저장된 게 있는데 아직 연결이 뚜렷하지 않아. 조금 더 넣어봐.';
  }

  const top = rankedNodes.slice(0, 5);
  const topLabels = top.map(x => x.node.label);

  // Strong edges between top nodes (not removed/weakened)
  const strongEdges = edges
    .filter(e =>
      e.userFeedback !== 'removed' &&
      e.strength > 0.25 &&
      top.some(x => x.node.id === e.sourceNodeId) &&
      top.some(x => x.node.id === e.targetNodeId)
    )
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  // Top aesthetic nodes
  const aestheticNodes = top.filter(x => x.node.nodeType === 'Aesthetic').slice(0, 3);
  const interestNodes = top.filter(x => x.node.nodeType === 'Interest').slice(0, 3);
  const projectNodes = top.filter(x => x.node.nodeType === 'Project').slice(0, 2);

  let response = '';

  if (intent === 'tastes' || intent === 'interests') {
    const snippets = top.slice(0, 3).flatMap(x => getSnippets(x.node.label, 1));
    response = `지금까지 저장된 것들을 보면, `;
    if (snippets.length >= 2) {
      response += snippets.slice(0, 2).join(', ') + '.';
    } else {
      response += snippets[0] ?? '';
    }
    if (strongEdges.length > 0) {
      const e = strongEdges[0];
      const srcNode = nodes.find(n => n.id === e.sourceNodeId);
      const tgtNode = nodes.find(n => n.id === e.targetNodeId);
      if (srcNode && tgtNode) {
        response += ` 특히 '${srcNode.label}'와 '${tgtNode.label}'이 반복적으로 함께 등장해.`;
      }
    }
  } else if (intent === 'aesthetics') {
    if (aestheticNodes.length > 0) {
      const aesthetic = aestheticNodes.map(x => getSnippets(x.node.label, 1)[0]).join(', ');
      response = `시각적으로 보면: ${aesthetic}.`;
      if (aestheticNodes.length >= 2) {
        response += ` 전체적으로 ${aestheticNodes[0].node.label} 계열 미학이 중심을 잡고 있어.`;
      }
    } else if (top.length > 0) {
      response = `명확한 미적 패턴이 형성 중이야. ${getSnippets(top[0].node.label, 1)[0]}.`;
    }
  } else if (intent === 'projects') {
    if (projectNodes.length > 0) {
      const proj = projectNodes.map(x => x.node.label).join(', ');
      response = `저장물에서 반복되는 프로젝트 방향: ${proj}.`;
      const related = interestNodes.slice(0, 2).map(x => x.node.label).join(', ');
      if (related) response += ` 이 방향이 ${related}에 대한 관심과 연결되어 있어.`;
    } else {
      response = `아직 명확한 프로젝트 방향보다는, ${topLabels.slice(0, 2).join(', ')} 쪽의 관심이 먼저 형성되고 있어.`;
    }
  } else if (intent === 'data') {
    response = `저장된 것들을 보면 ${topLabels.slice(0, 3).join(', ')} 주제가 반복돼.`;
    const topCards = cards
      .filter(c => !c.userRejected)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2);
    if (topCards.length > 0) {
      response += ` 특히 "${topCards[0].description}" 같은 맥락이 강하게 형성되어 있어.`;
    }
  } else {
    // General — synthesize from top nodes and their connections
    const desc = top.slice(0, 3).flatMap(x => getSnippets(x.node.label, 1)).join(', ');
    if (desc) {
      response = `지금까지 보면 — ${desc}.`;
    } else {
      response = `저장물에서 ${topLabels.slice(0, 3).join(', ')} 패턴이 형성되고 있어.`;
    }
    if (strongEdges.length >= 2) {
      const e = strongEdges[0];
      const srcNode = nodes.find(n => n.id === e.sourceNodeId);
      const tgtNode = nodes.find(n => n.id === e.targetNodeId);
      if (srcNode && tgtNode) {
        response += ` '${srcNode.label}'와 '${tgtNode.label}' 사이의 연결이 특히 강해.`;
      }
    }
  }

  return response || `${topLabels.slice(0, 2).join(', ')} 방향으로 패턴이 형성 중이야.`;
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export const localHeuristicAdapter: AgentAdapter = {
  async generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents) {
    // Empty — no data yet
    if (profile.formationStage === 'empty') {
      return '안녕해. 뭔가 저장하면 내가 형성돼. 텍스트, 이미지, 파일 뭐든 넣어봐.';
    }

    const intent = detectIntent(userMessage);

    // Negative feedback
    if (intent === 'negative') {
      const weakenedEdges = edges
        .filter(e => e.userFeedback === 'weakened' || e.userFeedback === 'removed');
      if (weakenedEdges.length > 0) {
        return 'Brain Map에서 끊은 연결을 반영했어. 그 방향 비중을 줄이고 있어.';
      }
      return 'Brain Map을 열어서 잘못된 연결을 직접 끊어줘. 다음 대화에 반영돼.';
    }

    // Seed stage — some data but not much
    if (profile.formationStage === 'seed') {
      const topCards = cards
        .filter(c => !c.userRejected)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 2);

      if (topCards.length === 0) {
        return '뭔가 넣고 있는데 아직 패턴이 뚜렷하지 않아. 조금만 더 쌓으면 보여.';
      }

      const desc = topCards[0].description;
      return `아직 초기야. 지금까지 보이는 건 — ${desc}.`;
    }

    // Emerging / personal_worldview — use full graph data
    return buildPersonaResponse(intent, cards, nodes, edges, feedbackEvents);
  },
};
