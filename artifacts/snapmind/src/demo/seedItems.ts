import type { RawItem, MultimodalSignal } from '../domain/types';

// Fixed IDs so DEMO_SEED_SIGNALS mapping is stable
export const DEMO_SEED_ITEM_IDS = {
  hologramUI: 'demo-seed-001',
  constellation: 'demo-seed-002',
  brainNeuron: 'demo-seed-003',
  agentText: 'demo-seed-004',
  localFirst: 'demo-seed-005',
} as const;

export function makeSeedItems(): RawItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: DEMO_SEED_ITEM_IDS.hologramUI,
      createdAt: new Date(Date.now() - 300_000).toISOString(),
      assetType: 'image',
      entryPoint: 'demo_seed',
      title: '홀로그래픽 UI 레퍼런스',
      fileName: 'hologram_ui_reference.png',
      processingStatus: 'queued',
    },
    {
      id: DEMO_SEED_ITEM_IDS.constellation,
      createdAt: new Date(Date.now() - 240_000).toISOString(),
      assetType: 'image',
      entryPoint: 'demo_seed',
      title: '별자리 맵 레퍼런스',
      fileName: 'constellation_knowledge_map.png',
      processingStatus: 'queued',
    },
    {
      id: DEMO_SEED_ITEM_IDS.brainNeuron,
      createdAt: new Date(Date.now() - 180_000).toISOString(),
      assetType: 'image',
      entryPoint: 'demo_seed',
      title: 'AI 뇌 뉴런 레퍼런스',
      fileName: 'brain_neuron_network.png',
      processingStatus: 'queued',
    },
    {
      id: DEMO_SEED_ITEM_IDS.agentText,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
      assetType: 'text',
      entryPoint: 'demo_seed',
      title: '개인 세계관 에이전트',
      textContent:
        '개인 세계관 Agent. 내가 저장한 것들이 나를 아는 에이전트가 된다. 로컬에서 조용히 형성되는 지식 구조. 외부로 나가지 않는 프라이버시.',
      processingStatus: 'queued',
    },
    {
      id: DEMO_SEED_ITEM_IDS.localFirst,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      assetType: 'text',
      entryPoint: 'demo_seed',
      title: '로컬 퍼스트 메모리',
      textContent:
        '로컬 퍼스트 메모리. Ground-Truth Vault. 데이터 주권, 프라이버시, 신뢰. 조용하고 집중된 지식 구조. 클라우드 없이 완결되는 시스템.',
      processingStatus: 'queued',
    },
  ];
}

// Pre-defined signals for demo seed items (so they don't need actual image blobs)
const now = new Date().toISOString();

export const DEMO_SEED_SIGNALS: Record<string, MultimodalSignal[]> = {
  [DEMO_SEED_ITEM_IDS.hologramUI]: [
    { id: 'ds1-sig-1', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'aesthetic', value: 'hologram', confidence: 0.92, createdAt: now },
    { id: 'ds1-sig-2', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'aesthetic', value: 'neon-blue', confidence: 0.85, createdAt: now },
    { id: 'ds1-sig-3', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'aesthetic', value: 'layered', confidence: 0.78, createdAt: now },
    { id: 'ds1-sig-4', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'keyword', value: 'depth', confidence: 0.72, createdAt: now },
    { id: 'ds1-sig-5', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'visual_caption', value: '차가운 블루 네온 계열의 홀로그래픽 인터페이스. 반투명하게 겹치는 레이어드 구성.', confidence: 0.88, createdAt: now },
    { id: 'ds1-sig-6', itemId: DEMO_SEED_ITEM_IDS.hologramUI, kind: 'intent', value: '차가운 블루톤의 홀로그래픽 인터페이스에 반복적으로 끌림', confidence: 0.80, createdAt: now },
  ],
  [DEMO_SEED_ITEM_IDS.constellation]: [
    { id: 'ds2-sig-1', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'aesthetic', value: 'constellation', confidence: 0.90, createdAt: now },
    { id: 'ds2-sig-2', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'keyword', value: 'network', confidence: 0.85, createdAt: now },
    { id: 'ds2-sig-3', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'keyword', value: 'connection', confidence: 0.80, createdAt: now },
    { id: 'ds2-sig-4', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'aesthetic', value: 'depth', confidence: 0.75, createdAt: now },
    { id: 'ds2-sig-5', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'visual_caption', value: '점과 선으로 구성된 별자리형 지식 맵. 관계가 직접 보이는 구조.', confidence: 0.87, createdAt: now },
    { id: 'ds2-sig-6', itemId: DEMO_SEED_ITEM_IDS.constellation, kind: 'intent', value: '연결과 관계를 구조로 보는 방식에 끌림', confidence: 0.78, createdAt: now },
  ],
  [DEMO_SEED_ITEM_IDS.brainNeuron]: [
    { id: 'ds3-sig-1', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'keyword', value: 'brain', confidence: 0.90, createdAt: now },
    { id: 'ds3-sig-2', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'keyword', value: 'neuron', confidence: 0.88, createdAt: now },
    { id: 'ds3-sig-3', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'keyword', value: 'network', confidence: 0.82, createdAt: now },
    { id: 'ds3-sig-4', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'aesthetic', value: 'neon-blue', confidence: 0.75, createdAt: now },
    { id: 'ds3-sig-5', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'visual_caption', value: 'AI 뇌 구조와 뉴런 네트워크. 지식이 연결되는 방식을 시각화.', confidence: 0.85, createdAt: now },
    { id: 'ds3-sig-6', itemId: DEMO_SEED_ITEM_IDS.brainNeuron, kind: 'intent', value: '인지 구조와 지식 연결 방식에 대한 관심', confidence: 0.82, createdAt: now },
  ],
  [DEMO_SEED_ITEM_IDS.agentText]: [
    { id: 'ds4-sig-1', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'intent', value: 'agent', confidence: 0.95, createdAt: now },
    { id: 'ds4-sig-2', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'keyword', value: 'worldview', confidence: 0.88, createdAt: now },
    { id: 'ds4-sig-3', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'intent', value: 'local-first', confidence: 0.85, createdAt: now },
    { id: 'ds4-sig-4', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'intent', value: 'privacy', confidence: 0.88, createdAt: now },
    { id: 'ds4-sig-5', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'aesthetic', value: 'quiet', confidence: 0.75, createdAt: now },
    { id: 'ds4-sig-6', itemId: DEMO_SEED_ITEM_IDS.agentText, kind: 'keyword', value: 'knowledge', confidence: 0.80, createdAt: now },
  ],
  [DEMO_SEED_ITEM_IDS.localFirst]: [
    { id: 'ds5-sig-1', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'intent', value: 'privacy', confidence: 0.92, createdAt: now },
    { id: 'ds5-sig-2', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'intent', value: 'local-first', confidence: 0.90, createdAt: now },
    { id: 'ds5-sig-3', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'keyword', value: 'memory', confidence: 0.85, createdAt: now },
    { id: 'ds5-sig-4', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'aesthetic', value: 'quiet', confidence: 0.80, createdAt: now },
    { id: 'ds5-sig-5', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'keyword', value: 'knowledge', confidence: 0.78, createdAt: now },
    { id: 'ds5-sig-6', itemId: DEMO_SEED_ITEM_IDS.localFirst, kind: 'keyword', value: 'depth', confidence: 0.72, createdAt: now },
  ],
};
