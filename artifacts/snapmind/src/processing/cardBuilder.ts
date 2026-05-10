import { v4 as uuidv4 } from 'uuid';
import type { MultimodalSignal, JudgmentCard } from '../domain/types';

// ---------------------------------------------------------------------------
// Natural-language description templates per signal value
// ---------------------------------------------------------------------------

const KEYWORD_DESCRIPTIONS: Record<string, string> = {
  hologram: '반투명하고 겹겹이 쌓이는 홀로그래픽 레이어에 끌림. 빛이 공간 속에 떠 있는 인터페이스.',
  'neon-blue': '차가운 블루 네온 계열의 인터페이스가 반복적으로 등장. 전기적이고 선명한 에너지.',
  holographic: '홀로그래픽 비주얼. 빛과 공간이 겹치는 레이어드 미학.',
  constellation: '점과 선으로 연결된 별자리형 구조. 관계가 직접 보이는 지식 지도.',
  network: '연결과 관계를 구조로 시각화하는 방식. 개별 요소보다 연결 패턴에 끌림.',
  brain: '뇌와 인지 구조에 대한 관심. 어떻게 정보가 연결되고 기억되는지.',
  neuron: '뉴런 방식의 지식 연결. 신호가 전파되고 강화되는 구조적 사고.',
  agent: '개인화된 AI 에이전트. 내가 쌓은 것이 곧 나를 아는 존재가 되는 개념.',
  privacy: '데이터 주권과 프라이버시. 외부로 나가지 않는 정보 신뢰 구조.',
  'local-first': '로컬 우선 철학. 클라우드 없이 내 장치 안에서 완결되는 시스템.',
  local: '로컬 우선 철학. 통제와 신뢰가 기반인 데이터 구조.',
  memory: '기억과 저장의 방식. 무엇을 간직하고, 어떻게 되살릴지.',
  minimal: '군더더기 없는 조용한 인터페이스. 필요한 것만 남긴 절제된 미학.',
  quiet: '조용하고 집중된 환경. 소음 없이 핵심에 집중하는 감각.',
  worldview: '개인 세계관의 구체화. 내가 보는 방식 자체를 구조로 만들고 싶은 욕구.',
  design: '시각적 구성과 인터페이스 미학. 형태가 기능을 담는 방식에 관심.',
  knowledge: '지식의 구조화와 연결. 개념들이 서로 연결되는 방식.',
  depth: '레이어와 깊이를 가진 시각 구성. 단순한 표면 너머의 구조.',
  layered: '겹겹이 쌓인 레이어드 구조. 복잡한 관계를 투명하게 드러내는 방식.',
  neon: '네온 광채와 선명한 디지털 에너지. 빛이 공간에 새겨지는 느낌.',
  blue: '깊고 차가운 블루 계열. 집중과 신뢰, 고요함을 담은 색.',
  teal: '청록 계열의 날카롭고 미래적인 느낌.',
  connection: '연결과 관계에 대한 관심. 개별보다 사이의 공간.',
  complex: '복잡한 구조에서 패턴을 발견하는 방식.',
  clarity: '맑고 선명한 시각 언어. 불필요한 것을 걷어낸 명료함.',
  energy: '강렬하고 생동감 있는 시각적 에너지.',
  dark: '어두운 배경 위에 빛이 부각되는 구성. 극적인 대비와 집중.',
  contrast: '강한 대비와 명암. 중요한 것을 부각시키는 시각 언어.',
  futuristic: '미래적인 비주얼 언어. 아직 오지 않은 인터페이스의 감각.',
  mystical: '신비롭고 초월적인 시각. 단순한 현실 너머의 감각.',
  'cool-tone': '차가운 색조. 논리적이고 정밀한 감각.',
  dramatic: '극적인 구성과 강렬한 시각적 인상.',
  'network-like': '네트워크 구조를 연상시키는 복잡한 레이어.',
  image: '시각적 참고 자료. 이미지로 저장된 감각과 아이디어.',
  reference: '참고 자료로 저장. 나중에 되살릴 영감의 원천.',
  data: '데이터 구조와 정보 설계에 대한 관심.',
  depth2: '깊이와 레이어. 표면 너머의 구조.',
};

function describeSignal(kind: MultimodalSignal['kind'], value: string, rawText?: string): string {
  // Try exact match first
  const exact = KEYWORD_DESCRIPTIONS[value.toLowerCase()];
  if (exact) return exact;

  // Try partial match
  const partial = Object.keys(KEYWORD_DESCRIPTIONS).find(k => value.toLowerCase().includes(k) || k.includes(value.toLowerCase()));
  if (partial) return KEYWORD_DESCRIPTIONS[partial];

  // Kind-based fallback
  switch (kind) {
    case 'aesthetic':
      return `${value} 계열의 미적 감각이 반복적으로 등장. 시각 언어의 일부로 형성 중.`;
    case 'keyword':
      return `'${value}'에 대한 관심이 저장물에서 반복됨.`;
    case 'intent':
      return `${value} — 저장물에서 드러난 관심 방향.`;
    case 'visual_caption':
      return rawText ?? value;
    case 'file_text':
      return `텍스트 저장물에서 추출. 직접 입력한 생각의 흔적.`;
    case 'metadata':
      return `파일 메타데이터 신호.`;
    default:
      return `${value}에 대한 관심 신호.`;
  }
}

function getCardType(kind: MultimodalSignal['kind']): JudgmentCard['type'] {
  switch (kind) {
    case 'aesthetic':       return 'aesthetic_reference';
    case 'visual_caption':  return 'evidence_record';
    case 'intent':          return 'project_signal';
    case 'keyword':         return 'interest_signal';
    case 'file_text':       return 'memory_moment';
    case 'metadata':        return 'evidence_record';
    default:                return 'interest_signal';
  }
}

function getNodeTypeHint(kind: MultimodalSignal['kind'], value: string): string {
  if (kind === 'aesthetic' || kind === 'visual_caption') return 'Aesthetic';
  if (kind === 'intent') return 'Project';
  if (['brain', 'neuron', 'memory', 'knowledge'].some(k => value.includes(k))) return 'Idea';
  return 'Interest';
}

export function buildCards(
  signals: MultimodalSignal[],
  existingCards: JudgmentCard[]
): JudgmentCard[] {
  const cards: JudgmentCard[] = [...existingCards];
  const now = new Date().toISOString();

  // Skip metadata-only signals — they are not useful as JudgmentCards
  const usableSignals = signals.filter(s => {
    if (s.kind === 'metadata' && s.value.startsWith('composition:')) return false;
    if (s.kind === 'metadata' && s.value.startsWith('filename:')) return false;
    if (s.kind === 'file_text') return false; // too long, not a good card
    return true;
  });

  for (const signal of usableSignals) {
    const cardType = getCardType(signal.kind);
    const existing = cards.find(
      c => c.signal.toLowerCase() === signal.value.toLowerCase() && c.type === cardType
    );

    if (existing) {
      const idx = cards.indexOf(existing);
      const newSourceItemIds = [...new Set([...existing.sourceItemIds, signal.itemId])];
      cards[idx] = {
        ...existing,
        sourceItemIds: newSourceItemIds,
        sourceCount: newSourceItemIds.length,
        strength: Math.min(existing.strength + 0.12, 1.0),
        recency: 'high',
        updatedAt: now,
      };
    } else {
      const description = describeSignal(signal.kind, signal.value);
      const nodeTypeHint = getNodeTypeHint(signal.kind, signal.value);

      cards.push({
        id: uuidv4(),
        type: cardType,
        signal: signal.value,
        description,
        sourceItemIds: [signal.itemId],
        strength: signal.confidence * 0.65,
        confidence: signal.confidence,
        sourceCount: 1,
        recency: 'high',
        userConfirmed: false,
        userRejected: false,
        usableFor: [nodeTypeHint],
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Return only the cards that were created or modified (not pre-existing unchanged ones)
  const existingIds = new Set(existingCards.map(c => c.id));
  return cards.filter(c => !existingIds.has(c.id) || existingCards.find(e => e.id === c.id)?.updatedAt !== c.updatedAt);
}
