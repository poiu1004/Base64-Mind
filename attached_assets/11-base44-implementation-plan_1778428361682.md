# SnapMind MVP Implementation Plan

이 문서는 BASE44, Claude, Codex, v0, Lovable 등 AI 개발 도구에 그대로 전달할 수 있는 SnapMind 웹/PWA MVP 구현 계획이다.

최상위 기준: `docs/10-ai-builder-handoff.md`

이 문서 안의 기준만으로 구현을 진행할 수 있어야 한다. 목표는 기능을 줄이는 것이 아니라 정의된 MVP를 완성하는 것이다.

---

## 1. Product Definition & Non-Negotiable Principles

### What SnapMind Is

SnapMind는 사용자가 넣은 저장물(screenshots, images, files, text)이 개인 Agent가 되는 앱이다.

> SnapMind는 저장물을 검색하는 앱이 아니라, 저장물이 Agent가 되는 앱이다.

### What SnapMind Is NOT

- 파일 검색 앱
- 스크린샷 정리 앱
- 파일 매니저
- generic chatbot
- AI friend / 감정 동반자
- schedule app
- Recall clone

### Non-Negotiable Rules

**No User Classification:**
사용자에게 입력물의 카테고리, 의도, 목적을 묻지 않는다. 태그, 폴더, 카테고리, 프로젝트 선택을 요구하지 않는다. 모든 입력은 같은 Agent material pool로 들어간다.

**Low Confidence Is Internal:**
confidence가 낮아도 사용자에게 clarifying question을 하지 않는다. 대신 내부적으로 strength/confidence를 낮추고, neuron/edge 승격을 보류하고, 답변에서 비중을 줄인다.

**No Default Sources:**
기본 답변에 source IDs, confidence scores, raw source lists, 분석 리포트를 노출하지 않는다. 사용자가 명시적으로 파일 찾기를 요청할 때만 원본을 보여준다.

**Do Not Shrink The MVP:**
Feed, Form, Talk, 3D Worldview Brain Map, Feedback Mode, FeedbackEvent, feedback-to-conversation reflection은 축소할 수 없다.

---

## 2. MVP Loop: Feed -> Form -> Talk -> Feedback -> Return

```text
Feed -> Form -> Talk -> Feedback -> Return
```

| Stage | Description |
|-------|-------------|
| Feed | 사용자가 텍스트, 이미지, 파일을 태그/폴더 없이 넣는다 |
| Form | RawItem → Signal → JudgmentCard → GraphNode/Edge → AgentProfile |
| Talk | Agent가 저장 재료를 반영해 대화한다. 출처/분석 리포트 비노출 |
| Feedback | 3D Worldview Brain Map Feedback Mode에서 synapse edge 약화/삭제 |
| Return | 다음 대화가 수정된 graph state를 반영한다 |

이 루프 중 하나라도 끊기면 MVP가 아니다.

---

## 3. Tech Stack

### Required

| Package | Purpose |
|---------|---------|
| Vite | Build tool |
| React | UI framework |
| TypeScript | Type safety |
| vite-plugin-pwa | PWA support |
| Dexie | IndexedDB wrapper |
| Zustand | App-wide state |
| @react-three/fiber | React Three.js renderer |
| three | 3D engine |
| @react-three/drei | R3F helpers (OrbitControls, Billboard, Text) |
| d3-force-3d | 3D force-directed layout |
| uuid | ID generation |
| CSS modules or CSS variables | Styling |

### Optional

| Package | Purpose |
|---------|---------|
| API-backed multimodal adapter | High-quality extraction (proxy only) |

### Critical Constraints

- 기본 데모는 외부 AI 키 없이 동작해야 한다.
- API key를 public frontend에 노출하면 안 된다.
- 3D Brain Map은 React Three Fiber + Three.js + d3-force-3d로 구현한다.
- 2D FeedbackMap / SVG graph 계획은 폐기한다.

---

## 4. File-by-File Implementation Plan

### App Structure

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    AgentCore.tsx
    SnapBar.tsx
    ChatPanel.tsx
    FeedPreview.tsx
    WorldviewBrainMap.tsx
    BrainShell.tsx
    KeywordNeuron.tsx
    SynapseEdge.tsx
    BrainMapInspector.tsx
    NodeEditor.tsx
    brainMapTypes.ts          ← 3D ViewModel types (UI-only)
  db/
    dexie.ts
    repositories.ts
  domain/
    types.ts
    scoring.ts
    graph.ts
    formation.ts
  processing/
    pipeline.ts
    extractors.ts
    cardBuilder.ts
    graphBuilder.ts
    deleteRawItem.ts          ← deletion orchestration
  ai/
    agentAdapter.ts
    localHeuristicAdapter.ts
    apiAdapter.ts
  state/
    useSnapMindStore.ts
  demo/
    seedItems.ts
    demoScenario.ts
```

Total: 30 source files.

---

### `src/domain/types.ts`

**Role:** 전체 도메인 타입 8개 정의.

**Exports:**

```ts
type RawItem = {
  id: string;
  createdAt: string;
  assetType: "text" | "image" | "pdf" | "file" | "link";
  entryPoint: "snap_bar" | "import" | "demo_seed";
  title?: string;
  textContent?: string;
  blobId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  hash?: string;
  userNote?: string;
  processingStatus: "queued" | "processing" | "processed" | "failed";
};

type MultimodalSignal = {
  id: string;
  itemId: string;
  kind: "ocr_text" | "file_text" | "visual_caption" | "keyword" | "aesthetic" | "intent" | "metadata";
  value: string;
  confidence: number;
  createdAt: string;
};

type JudgmentCard = {
  id: string;
  type: "aesthetic_reference" | "interest_signal" | "project_signal" | "idea_seed" | "memory_moment" | "evidence_record" | "need_signal";
  signal: string;
  description: string;
  sourceItemIds: string[];
  strength: number;
  confidence: number;
  sourceCount: number;
  recency: "low" | "medium" | "high";
  userConfirmed: boolean;
  userRejected: boolean;
  usableFor: string[];
  createdAt: string;
  updatedAt: string;
};

type GraphNode = {
  id: string;                    // deterministic: see §7
  label: string;
  nodeType: "Interest" | "Aesthetic" | "Idea" | "Project" | "Place" | "Product" | "Moment" | "Evidence" | "Task" | "Need";
  strength: number;
  confidence: number;
  sourceCardIds: string[];
  userPinned: boolean;
  userRejected: boolean;
  createdAt: string;
  updatedAt: string;
};

type GraphEdge = {
  id: string;                    // deterministic: see §7
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: "similar" | "inspires" | "part_of" | "supports_project" | "reminds_of" | "needs_action" | "expresses_aesthetic";
  strength: number;
  confidence: number;
  sourceCardIds: string[];
  userFeedback: "none" | "weakened" | "removed" | "confirmed";
  createdAt: string;
  updatedAt: string;
};

type FeedbackEvent = {
  id: string;
  createdAt: string;
  targetType: "node" | "edge" | "card";
  targetId: string;
  action: "weaken" | "remove" | "rename" | "merge" | "pin" | "detach_item";
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
};

type AgentProfile = {
  id: "local-agent";
  formationStage: "empty" | "seed" | "emerging" | "personal_worldview";
  dominantSignals: string[];
  summaryForAgent: string;
  lastFormedAt?: string;
  itemCount: number;
  cardCount: number;
  feedbackCount: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  relatedItemIds?: string[];
  sourceCardIds?: string[];
};
```

`BrainNodeViewModel`과 `BrainEdgeViewModel`은 이 파일에 넣지 않는다. `src/components/brainMapTypes.ts`에 분리한다 (§8 참조).

**Dependencies:** None (lowest-level module).

---

### `src/domain/scoring.ts`

**Role:** Graph Scoring Engine. JudgmentCard에서 neuron_strength와 edge_strength를 계산.

**Exports:**

- `computeNeuronStrength(card, existingNode?, signals?)` → number
  ```text
  neuron_strength = card_strength + repeat_weight + recency_weight
    + source_diversity_weight + user_pin_weight
    - user_rejection_weight - decay_weight
  ```
- `computeEdgeStrength(sourceNode, targetNode, cards, existingEdge?)` → number
  ```text
  edge_strength = semantic_similarity + co_occurrence_weight
    + shared_project_weight + shared_aesthetic_weight + repeated_pair_weight
    - feedback_weaken_weight - feedback_remove_weight
  ```
- `shouldPromoteToNeuron(score, confidence)` → boolean
  - low-confidence는 승격 보류 (사용자 질문 없이)
- `applyFeedback(edge, action)` → GraphEdge (new object)
  - remove: strength = 0.05, userFeedback = "removed"
  - weaken: strength *= 0.35, userFeedback = "weakened"
  - confirm: strength += 0.15 (max 1.0), userFeedback = "confirmed"

**Dependencies:** `types.ts`

---

### `src/domain/graph.ts`

**Role:** Personal Ontology 경량 구현. Node type, edge type, relation rules, deterministic ID 생성.

**Exports:**

- `VALID_NODE_TYPES` — 10종
- `VALID_EDGE_TYPES` — 7종
- `canConnect(sourceType, targetType, edgeType)` → boolean
- `inferEdgeType(sourceNode, targetNode, sharedCards)` → edgeType | null
- `normalizeLabel(raw: string)` → string
- `makeNodeId(normalizedLabel, nodeType)` → string (deterministic, §7)
- `makeEdgeId(sourceNodeId, targetNodeId, edgeType)` → string (deterministic, §7)

**Dependencies:** `types.ts`

---

### `src/domain/formation.ts`

**Role:** AgentProfile 재계산. 형성 단계 결정.

**Exports:**

- `recomputeAgentProfile(items, cards, nodes, edges, feedback)` → AgentProfile (new object)
  - empty: items 0개
  - seed: items 1+개
  - emerging: 반복 신호 존재
  - personal_worldview: 5+개 강한 카드
  - dominantSignals: high-strength cards의 signal 추출
  - summaryForAgent: 자연어 요약 (카드/노드 기반)

**Dependencies:** `types.ts`, `scoring.ts`

---

### `src/db/dexie.ts`

**Role:** Dexie schema 정의. IndexedDB 9 tables.

**Exports:**

- `db` — Dexie instance

**Tables & Indexes:**

| Table | Indexes |
|-------|---------|
| rawItems | id, createdAt, processingStatus |
| blobs | id |
| signals | id, itemId |
| judgmentCards | id, type, strength |
| graphNodes | id, label, nodeType, strength |
| graphEdges | id, sourceNodeId, targetNodeId, edgeType |
| feedbackEvents | id, targetId |
| chatMessages | id, createdAt |
| agentProfiles | id |

**Dependencies:** dexie

---

### `src/db/repositories.ts`

**Role:** 테이블별 순수 CRUD 함수. 비즈니스 로직 없음.

> repositories.ts는 순수 CRUD만 담당한다. 삭제 후 graph 재계산, AgentProfile 갱신 같은 비즈니스 로직은 넣지 않는다.

**Exports:**

- `rawItemRepo` — { create, getById, getAll, updateStatus, remove }
- `blobRepo` — { save, getById, remove }
- `signalRepo` — { create, getByItemId, removeByItemId }
- `cardRepo` — { create, upsert, getAll, getByIds, getHighStrength, removeBySourceItem, updateSourceItemIds }
- `nodeRepo` — { create, upsert, getAll, getById, updateStrength, remove }
- `edgeRepo` — { create, upsert, getAll, getByNodeId, updateFeedback, remove }
- `feedbackRepo` — { create, getAll }
- `chatRepo` — { create, getRecent, getAll }
- `profileRepo` — { get, upsert }

**Principles:**

- 모든 create/update는 새 객체 반환 (immutability)
- `rawItemRepo.remove(id)`는 RawItem 레코드만 삭제한다. Signal, Card, Node, Edge 처리는 호출자(deleteRawItemAndRecompute)의 책임이다.
- `cardRepo.removeBySourceItem(itemId)`는 sourceItemIds에 해당 itemId를 포함하는 카드를 찾아 삭제한다.
- `cardRepo.updateSourceItemIds(cardId, newSourceItemIds)`는 카드의 sourceItemIds를 교체한다 (새 객체 반환).

**Dependencies:** `dexie.ts`, `types.ts`

---

### `src/state/useSnapMindStore.ts`

**Role:** Zustand 앱 전역 상태. UI 상태와 도메인 데이터 캐시.

**Exports:**

- `useSnapMindStore` — Zustand store

**State:**

```ts
{
  agentProfile: AgentProfile | null
  messages: ChatMessage[]
  isAgentThinking: boolean

  isBrainMapOpen: boolean
  brainMapMode: 'view' | 'feedback'
  selectedNodeId: string | null
  selectedEdgeId: string | null

  isProcessing: boolean
  processingItemId: string | null

  nodes: GraphNode[]
  edges: GraphEdge[]
  cards: JudgmentCard[]

  openBrainMap: () => void
  closeBrainMap: () => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setMode: (mode: 'view' | 'feedback') => void
  refreshFromDb: () => Promise<void>
  addMessage: (msg: ChatMessage) => void
}
```

**Dependencies:** `types.ts`, `repositories.ts`, zustand

---

### `src/processing/extractors.ts`

**Role:** RawItem에서 MultimodalSignal 추출.

**Exports:**

- `extractSignals(item: RawItem, blob?: Blob)` → MultimodalSignal[]

**Logic:**
- text: textContent에서 keyword, intent, aesthetic 신호 추출
- image: fileName에서 키워드 매칭 (hologram, blue, neon, constellation, brain 등)
- file: fileName + mimeType에서 metadata 신호
- userNote가 있으면 추가 keyword 신호
- demo_seed: seedItems의 사전 정의된 신호 매핑

**Dependencies:** `types.ts`

---

### `src/processing/cardBuilder.ts`

**Role:** MultimodalSignal → JudgmentCard 변환.

**Exports:**

- `buildCards(signals: MultimodalSignal[], existingCards: JudgmentCard[])` → JudgmentCard[]

**Logic:**
- 신호 kind에 따라 card type 매핑 (aesthetic → aesthetic_reference, keyword → interest_signal 등)
- 기존 카드와 신호가 겹치면 strength/sourceCount 증가 (새 객체 반환)
- 새 신호면 새 카드 생성 (strength: 0.3~0.5, confidence: 0.5~0.7 초기값)
- low-confidence 신호는 카드 strength를 낮게 설정 (사용자 질문 없이)

**Dependencies:** `types.ts`

---

### `src/processing/graphBuilder.ts`

**Role:** JudgmentCard → GraphNode + GraphEdge. Graph Scoring Engine 사용.

**Exports:**

- `buildGraph(cards, existingNodes, existingEdges)` → { nodes: GraphNode[], edges: GraphEdge[] }
- `recomputeGraph(remainingCards, existingNodes, existingEdges)` → { nodes: GraphNode[], edges: GraphEdge[] }

**buildGraph (item 추가 시):**
- 각 카드에 대해 computeNeuronStrength 호출
- shouldPromoteToNeuron 통과한 신호만 GraphNode 생성/업데이트
- GraphNode.id는 `makeNodeId(normalizeLabel(signal), nodeType)`로 생성 (deterministic)
- 노드 쌍에 대해 computeEdgeStrength 호출
- GraphEdge.id는 `makeEdgeId(sourceNodeId, targetNodeId, edgeType)`로 생성 (deterministic)
- 기존 노드/엣지는 새 객체로 업데이트 (immutability)

**recomputeGraph (RawItem 삭제 시):**
- remainingCards만으로 전체 graph를 재계산
- 기존 노드/엣지의 userFeedback, userPinned 상태는 보존 (사용자 피드백 유실 방지)
- deterministic ID 덕분에 같은 label+type의 노드는 같은 ID를 유지 → FeedbackEvent 유효
- cards로 지지되지 않는 노드: shouldPromoteToNeuron 탈락 시 제거
- cards로 지지되지 않는 엣지: 삭제
- 다른 cards에서 여전히 지지되는 노드/엣지: 갱신된 strength로 유지

**Dependencies:** `types.ts`, `scoring.ts`, `graph.ts`

---

### `src/processing/pipeline.ts`

**Role:** processRawItem(itemId) 구현. 전체 처리 파이프라인 오케스트레이션.

**Exports:**

- `processRawItem(itemId: string)` → Promise\<void\>

**Steps:**
1. RawItem 로드 + status를 `processing`으로 변경
2. blob/text 로드
3. `extractSignals(item, blob)` → signals 저장
4. `buildCards(signals, existingCards)` → cards 저장
5. `buildGraph(cards, existingNodes, existingEdges)` → nodes/edges 저장
6. `recomputeAgentProfile(...)` → profile 저장
7. RawItem status를 `processed`로 변경
8. 실패 시 status를 `failed`로 변경. 원본 RawItem 유지.

**Dependencies:** `repositories.ts`, `extractors.ts`, `cardBuilder.ts`, `graphBuilder.ts`, `formation.ts`

---

### `src/processing/deleteRawItem.ts`

**Role:** RawItem 삭제 + graph/profile 재계산 오케스트레이션.

> repositories.ts는 순수 CRUD이므로, 삭제 후 graph 재계산 로직은 이 파일에서 담당한다.

**Exports:**

- `deleteRawItemAndRecompute(itemId: string)` → Promise\<void\>

**Steps:**

1. 해당 RawItem의 Signal 전체 삭제: `signalRepo.removeByItemId(itemId)`
2. 해당 RawItem을 sourceItemIds에 포함하는 JudgmentCard 처리:
   - 각 카드의 sourceItemIds에서 해당 itemId 제거
   - sourceItemIds가 빈 배열이 되면 해당 카드 삭제
   - sourceItemIds에 다른 item이 남아 있으면 카드 유지 (sourceCount 감소, 새 객체 반환)
3. blob 삭제: `blobRepo.remove(blobId)`
4. RawItem 삭제: `rawItemRepo.remove(itemId)`
5. 남은 전체 cards 로드: `cardRepo.getAll()`
6. **Node/Edge는 직접 삭제하지 않음** → `recomputeGraph(remainingCards, existingNodes, existingEdges)` 호출
7. recomputeGraph 결과로 nodes/edges를 IndexedDB에 반영 (upsert + 불필요 노드/엣지 삭제)
8. `recomputeAgentProfile(...)` 호출하여 AgentProfile 갱신

**Why this design:**
- 같은 keyword neuron이 다른 저장물에서도 나온 경우, 해당 저장물의 cards가 남아 있으므로 neuron 보존
- deterministic ID 덕분에 재계산 후에도 같은 neuron/edge는 같은 ID를 유지
- FeedbackEvent가 참조하는 targetId가 재계산 후에도 유효

**Dependencies:** `repositories.ts`, `graphBuilder.ts`, `formation.ts`

---

### `src/ai/agentAdapter.ts`

**Role:** Agent 응답 생성 인터페이스.

**Exports:**

```ts
interface AgentAdapter {
  generateReply(
    userMessage: string,
    profile: AgentProfile,
    cards: JudgmentCard[],
    nodes: GraphNode[],
    edges: GraphEdge[],
    feedbackEvents: FeedbackEvent[]
  ): Promise<string>;
}

function getAdapter(): AgentAdapter  // localHeuristic default, API optional
```

**Dependencies:** `types.ts`

---

### `src/ai/localHeuristicAdapter.ts`

**Role:** 외부 AI 키 없이 동작하는 기본 응답 어댑터.

**Exports:**

- `localHeuristicAdapter: AgentAdapter`

**Live Data Principle (critical):**

> 데모 응답 템플릿은 허용하지만, 고정 스크립트만으로 답하면 안 된다.
> 반드시 매 응답마다 인자로 받은 최신 데이터를 읽고 답변을 구성해야 한다.

`generateReply()` 호출 시 반드시 수행하는 단계:

```text
1. 인자로 받은 cards, nodes, edges, feedbackEvents, profile 사용 (호출 시점의 최신 상태)
2. cards를 strength 내림차순 정렬
3. userRejected === true인 카드 제외
4. feedbackEvents에서 removed/weakened edge 목록 수집
5. weakened edge에 연결된 노드의 키워드 가중치 *= 0.35
6. removed edge에 연결된 노드의 키워드 가중치 *= 0.05
7. 상위 키워드 3~5개 선택
8. 각 키워드에 매칭되는 snippet 조합
9. 부정 피드백 감지 ("별로야", "아닌데") → correction snippet + Brain Map 수정 제안
```

**Formation stage별 동작:**

- `empty`: 고정 안내 문구 허용 (데이터가 없으므로). "궁금한 거나 필요한 게 있으면 그냥 물어봐."
- `seed` 이상: **반드시** cards/nodes/edges/feedback를 읽어서 응답 구성
  - 어떤 snippet을 선택하는지는 라이브 데이터가 결정
  - weakened/removed edge의 키워드 비중 감소된 상태에서 조합

**Prohibited:**
- source ID, confidence score, 분석 리포트 노출
- low-confidence 시 사용자에게 분류/의도 확인 질문
- formationStage >= 'seed'에서 데이터를 읽지 않고 고정 응답 반환

**Dependencies:** `types.ts`, `agentAdapter.ts`

---

### `src/ai/apiAdapter.ts`

**Role:** API-backed 고품질 응답 어댑터. 선택 사항.

**Exports:**

- `apiAdapter: AgentAdapter`

**Logic:**
- system prompt를 매 대화마다 동적 구성 (cards, graph, feedback 반영)
- API 키는 프론트엔드에 노출하지 않음 (proxy 경유)
- 실패 시 localHeuristicAdapter로 fallback
- 초기 구현에서는 placeholder로 시작

**Dependencies:** `types.ts`, `agentAdapter.ts`

---

### `src/components/AgentCore.tsx`

**Role:** 홈 화면 중상단의 추상 Agent 비주얼.

**Rendering:**
- CSS animation / Canvas 2D (R3F가 아님)
- 빛나는 코어, 구체, 유기적 형태
- formationStage에 따른 밀도/밝기/색 변화:
  - empty: 작고 희미
  - seed: 약간 밝아짐
  - emerging: 주변에 작은 연결점 등장
  - personal_worldview: 밀도 높고 연결감 있음
- long-press / right-click → Brain Map 진입 이벤트

**Prohibited:** 사람형, 동물, 마스코트

**Dependencies:** `useSnapMindStore.ts`

---

### `src/components/SnapBar.tsx`

**Role:** 하단 입력 바.

**Features:**
- 텍스트 입력 필드
- 이미지 업로드 버튼 (accept="image/*")
- 파일 업로드 버튼
- 전송 버튼
- 복수 아이템 지원

**Prohibited:** 태그/폴더/카테고리 선택 UI

**Confirmation:** "받았어요. 조금씩 형성되고 있어요."

**Flow:**
1. RawItem 생성 + blob 저장
2. processRawItem(id) 호출 (비동기)
3. 처리 완료 후 store.refreshFromDb()

**Dependencies:** `repositories.ts`, `pipeline.ts`, `useSnapMindStore.ts`

---

### `src/components/ChatPanel.tsx`

**Role:** 대화 UI.

**Features:**
- 메시지 목록 (스크롤)
- 텍스트 입력 + 전송
- Agent 응답 대기 중 calm 로딩 인디케이터
- before/after 데이터 기반 답변 차이 표시

**Flow:**
1. 사용자 메시지 → chatRepo.create
2. **최신 데이터 로드:** IndexedDB에서 cards, nodes, edges, feedbackEvents, profile을 매번 새로 읽음
3. getAdapter().generateReply(message, profile, cards, nodes, edges, feedback) — 최신 데이터 전달
4. Agent 응답 → chatRepo.create
5. store.refreshFromDb()

**Dependencies:** `agentAdapter.ts`, `repositories.ts`, `useSnapMindStore.ts`

---

### `src/components/FeedPreview.tsx`

**Role:** 데이터 입력 시 경량 피드백 UI.

**Features:**
- 최근 입력된 아이템 미리보기 (이미지 썸네일, 텍스트 스니펫)
- 처리 상태 표시 (queued → processing → processed)
- "받았어요" 확인 토스트

**Dependencies:** `useSnapMindStore.ts`, `types.ts`

---

### `src/components/brainMapTypes.ts`

**Role:** 3D Brain Map 렌더링 전용 ViewModel 타입. 도메인 타입과 분리.

> BrainNodeViewModel과 BrainEdgeViewModel은 도메인 타입이 아니라 3D 렌더링 전용 타입이다.
> IndexedDB에 저장되는 GraphNode/GraphEdge와 d3-force-3d가 mutate하는 view model은 반드시 분리한다.

**Exports:**

```ts
type BrainNodeViewModel = {
  id: string;           // GraphNode.id 참조
  label: string;        // GraphNode.label 복사
  nodeType: string;     // GraphNode.nodeType 복사
  strength: number;     // GraphNode.strength 복사
  confidence: number;   // GraphNode.confidence 복사
  userPinned: boolean;  // GraphNode.userPinned 복사
  // d3-force-3d가 mutate하는 좌표 (도메인 데이터와 분리)
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
};

type BrainEdgeViewModel = {
  id: string;                              // GraphEdge.id 참조
  source: string | BrainNodeViewModel;     // 초기에는 sourceNodeId string,
  target: string | BrainNodeViewModel;     // d3-force-3d 실행 중 node object로 교체됨
  edgeType: string;                        // GraphEdge.edgeType 복사
  strength: number;                        // GraphEdge.strength 복사
  confidence: number;                      // GraphEdge.confidence 복사
  userFeedback: string;                    // GraphEdge.userFeedback 복사
};
```

**Why separate:**
- d3-force-3d는 전달된 객체의 x, y, z, vx, vy, vz 등을 직접 mutate한다.
- GraphNode/GraphEdge를 직접 전달하면 IndexedDB의 도메인 데이터가 오염된다.
- ViewModel을 별도로 생성하여 d3에 전달하면 도메인 데이터는 안전하다.

```ts
function toNodeViewModels(nodes: GraphNode[]): BrainNodeViewModel[]
function toEdgeViewModels(edges: GraphEdge[]): BrainEdgeViewModel[]

// d3-force-3d가 source/target을 string에서 node object로 바꾼 후,
// 렌더링 시 실제 위치를 안전하게 꺼내는 헬퍼
function resolveBrainNode(
  ref: string | BrainNodeViewModel
): BrainNodeViewModel | undefined
```

**Dependencies:** `types.ts` (GraphNode, GraphEdge 타입 참조만)

---

### `src/components/WorldviewBrainMap.tsx`

**Role:** 3D Brain Map 전체화면 오버레이.

**Features:**
- R3F `<Canvas>` scene
- OrbitControls (카메라 회전/줌/패닝)
- BrainShell, KeywordNeuron[], SynapseEdge[] 렌더링
- View Mode / Feedback Mode 전환 버튼
- BrainMapInspector 패널
- 닫기 버튼

**d3-force-3d Integration (ViewModel pattern):**

```text
1. store.nodes/edges가 변경될 때 useMemo로 ViewModel 배열 생성
   → toNodeViewModels(store.nodes), toEdgeViewModels(store.edges)
2. ViewModel 배열을 d3-force-3d forceSimulation에 전달
3. d3가 BrainNodeViewModel의 x,y,z를 mutate
4. d3가 BrainEdgeViewModel의 source/target을 string에서 BrainNodeViewModel object로 교체
5. IndexedDB의 원본 GraphNode/GraphEdge는 영향 없음
6. useFrame에서 ViewModel 좌표를 Three.js mesh position에 동기화
7. SynapseEdge 렌더링 시 resolveBrainNode(edge.source/target)으로 위치 해석
8. alphaDecay 높게 설정하여 빠른 안정화
9. 피드백 등으로 도메인 데이터 변경 시 → store.refreshFromDb() → ViewModel 재생성 → 시뮬레이션 재시작
```

**Dependencies:** `@react-three/fiber`, `@react-three/drei`, `d3-force-3d`, `useSnapMindStore.ts`, `brainMapTypes.ts`

---

### `src/components/BrainShell.tsx`

**Role:** 3D brain 외피.

**Rendering:**
- 반투명 구체 또는 icosahedron wireframe
- MeshBasicMaterial 또는 MeshStandardMaterial (transparent, opacity 0.05~0.15)
- 뉴런들을 감싸는 크기
- non-human, non-mascot, abstract

**Dependencies:** `@react-three/fiber`, three

---

### `src/components/KeywordNeuron.tsx`

**Role:** 3D keyword neuron 노드.

**Rendering:**
- Sphere geometry
- size = strength (0.2~1.0 범위 매핑)
- emissive brightness = confidence
- pulse animation = recency (optional)
- Billboard + Text로 라벨 (항상 카메라를 향함)

**Interaction:**
- onPointerOver: 호버 하이라이트
- onPointerDown: 노드 선택 → store.selectNode(id)

**Props:** `BrainNodeViewModel` (d3-force-3d에서 계산된 x,y,z 포함)

**Dependencies:** `@react-three/fiber`, `@react-three/drei`, `useSnapMindStore.ts`, `brainMapTypes.ts`

---

### `src/components/SynapseEdge.tsx`

**Role:** 3D synapse edge.

**Rendering:**
- 두 neuron 사이의 얇은 Cylinder/Tube mesh (raycasting 가능하게)
- thickness = strength
- opacity = confidence
- color = edgeType별 accent color

**Position Resolution:**
- d3-force-3d 실행 후 edge.source와 edge.target이 string에서 BrainNodeViewModel object로 교체됨
- 렌더링 시 `resolveBrainNode(edge.source)`로 source node의 x,y,z를 안전하게 꺼냄
- resolveBrainNode는 string이면 nodeMap에서 조회, object이면 그대로 반환

**Interaction:**
- onPointerDown: 엣지 선택 → store.selectEdge(id)

**Props:** `BrainEdgeViewModel` (source/target이 string | BrainNodeViewModel)

**Dependencies:** `@react-three/fiber`, `useSnapMindStore.ts`, `brainMapTypes.ts`

---

### `src/components/BrainMapInspector.tsx`

**Role:** 선택된 neuron/edge 정보 + 편집 패널.

**UX Principle: No Developer Info**

> sourceCardIds, raw confidence 숫자, 내부 ID는 기본 UI에 노출하지 않는다.
> strength/confidence는 뉴런 크기, 밝기, 엣지 두께/투명도로 이미 시각화되어 있다.
> 패널에는 사람이 이해할 수 있는 정보와 액션만 보여준다.

**View Mode — selected node:**
- keyword label (큰 텍스트)
- nodeType → 한국어: Interest→"관심사", Aesthetic→"미적 감각", Idea→"아이디어", Project→"프로젝트", Evidence→"참고 자료", Need→"필요", Moment→"기억", Place→"장소", Product→"제품", Task→"할 일"
- "이 키워드는 여러 저장물에서 반복 등장했어요" (sourceCardIds.length > 1일 때)
- "강하게 형성됨" / "아직 약한 신호" (strength 기반 자연어)
- **NOT shown:** id, sourceCardIds array, confidence decimal, timestamps

**View Mode — selected edge:**
- 연결된 두 keyword label: "A ↔ B"
- edgeType → 한국어: similar→"비슷한 맥락", inspires→"영감을 주는", part_of→"일부분", supports_project→"프로젝트를 뒷받침", reminds_of→"떠올리게 하는", needs_action→"행동이 필요한", expresses_aesthetic→"미적 감각을 표현"
- "강한 연결" / "약한 연결" (strength 기반)
- **NOT shown:** id, sourceNodeId/targetNodeId raw, sourceCardIds, confidence decimal

**Feedback Mode (required):**
- "이 연결 약하게 하기" → applyFeedback(edge, 'weaken')
- "이 연결 끊기" → applyFeedback(edge, 'remove')
- FeedbackEvent 생성 → feedbackRepo.create
- GraphEdge 업데이트 → edgeRepo.updateFeedback
- AgentProfile 재계산
- 확인: "반영했어요. 다음 대화에 적용돼요."

**Feedback Mode (if possible):**
- "이름 바꾸기" → neuron rename
- "중요 표시" → neuron pin
- neuron merge (미구현 시 non-blocking limitation 표시)
- item attach/detach (미구현 시 non-blocking limitation 표시)

**Dependencies:** `repositories.ts`, `scoring.ts`, `formation.ts`, `useSnapMindStore.ts`

---

### `src/components/NodeEditor.tsx`

**Role:** neuron rename, pin 등 상세 편집 UI.

**Features:**
- 이름 변경 입력 필드
- 중요 표시 토글
- FeedbackEvent 생성

**Dependencies:** `repositories.ts`, `useSnapMindStore.ts`

---

### `src/app/App.tsx`

**Role:** 앱 루트 컴포넌트.

**Structure:**

```text
<App>
  <Home>
    <AgentCore />
    <ChatPanel />
    <SnapBar />
    <FeedPreview />
  </Home>
  {isBrainMapOpen && <WorldviewBrainMap />}
</App>
```

**Init:**
- Dexie DB 연결
- IndexedDB에서 기존 데이터 로드 → Zustand store 초기화
- AgentProfile 로드 또는 생성

**Dependencies:** all components, `useSnapMindStore.ts`

---

### `src/app/routes.tsx`

**Role:** SPA 라우팅. 단일 페이지.

- `/` → Home (유일한 라우트)
- Brain Map은 라우트가 아니라 모달/오버레이

**Dependencies:** `App.tsx`

---

### `src/demo/seedItems.ts`

**Role:** 데모 시드 5개.

**Exports:**

- `DEMO_SEED_ITEMS: RawItem[]`
  1. Holographic UI screenshot reference (image, placeholder)
  2. Constellation map reference (image, placeholder)
  3. AI brain / keyword-neuron reference (image, placeholder)
  4. Text note: "personal worldview Agent"
  5. Text/file note: "local-first memory and Ground-Truth Vault"
- `DEMO_SEED_SIGNALS: Record<string, MultimodalSignal[]>` — 시드별 사전 정의 신호
  - 최소 신호: blue holographic UI, constellation graph, keyword neuron, personal worldview Agent, local-first memory, privacy trust, quiet core, agent formation

**Dependencies:** `types.ts`

---

### `src/demo/demoScenario.ts`

**Role:** 데모 시나리오 지원.

**Exports:**

- `DEMO_RESPONSES` — formationStage + 키워드 매칭 기반 응답 snippet pool
- `loadDemoSeed()` — 시드 아이템 5개를 한 번에 추가 + 처리

Note: DEMO_RESPONSES는 localHeuristicAdapter의 snippet pool로 사용된다. 고정 스크립트가 아니라 라이브 데이터와 조합하여 사용된다.

**Dependencies:** `seedItems.ts`, `pipeline.ts`, `repositories.ts`

---

## 5. Repository Layer = Pure CRUD

`repositories.ts`는 순수 데이터 접근 레이어이다.

**포함하는 것:**
- IndexedDB 테이블에 대한 create, read, update, delete
- 새 객체 반환 (immutability)
- 단일 테이블 범위의 쿼리

**포함하지 않는 것:**
- 삭제 후 graph 재계산
- AgentProfile 갱신
- Signal → Card → Node 변환
- 비즈니스 로직, 오케스트레이션

비즈니스 로직은 `processing/` 디렉토리의 pipeline, graphBuilder, deleteRawItem 등이 담당한다.

---

## 6. Deletion Orchestration: deleteRawItemAndRecompute()

파일: `src/processing/deleteRawItem.ts`

```text
deleteRawItemAndRecompute(itemId)
  │
  ├── 1. signalRepo.removeByItemId(itemId)
  │
  ├── 2. For each card where sourceItemIds includes itemId:
  │      ├── If sourceItemIds becomes empty → cardRepo.remove(cardId)
  │      └── If other items remain → cardRepo.updateSourceItemIds(cardId, filtered) + sourceCount--
  │
  ├── 3. blobRepo.remove(blobId)
  │
  ├── 4. rawItemRepo.remove(itemId)
  │
  ├── 5. remainingCards = cardRepo.getAll()
  │
  ├── 6. { nodes, edges } = recomputeGraph(remainingCards, existingNodes, existingEdges)
  │      ├── Preserves userFeedback, userPinned on surviving nodes/edges
  │      ├── Deterministic IDs ensure FeedbackEvent.targetId remains valid
  │      └── Nodes/edges with no card support are removed
  │
  ├── 7. Sync nodes/edges to IndexedDB (upsert surviving, remove orphans)
  │
  └── 8. recomputeAgentProfile(items, cards, nodes, edges, feedback)
```

---

## 7. Deterministic GraphNode/GraphEdge ID Policy

### Problem

graph를 재계산하면 Node/Edge가 새로 생성될 수 있다. 만약 ID가 랜덤(uuid)이면:

- 기존 FeedbackEvent.targetId가 재계산 후 무효해진다.
- 사용자가 약화한 edge가 다른 ID로 다시 생성되어 피드백이 적용되지 않는다.

### Solution

GraphNode와 GraphEdge의 ID를 deterministic하게 생성한다.

**GraphNode ID:**

```ts
function makeNodeId(normalizedLabel: string, nodeType: string): string {
  return `node:${normalizedLabel}:${nodeType}`;
}
```

Example: `node:hologram:Interest`, `node:quiet-core:Aesthetic`

**GraphEdge ID:**

```ts
function makeEdgeId(sourceNodeId: string, targetNodeId: string, edgeType: string): string {
  // 정렬하여 방향 무관하게 같은 ID 생성
  const [a, b] = [sourceNodeId, targetNodeId].sort();
  return `edge:${a}:${b}:${edgeType}`;
}
```

Example: `edge:node:hologram:Interest:node:quiet-core:Aesthetic:similar`

**Guarantees:**

- 같은 keyword + 같은 nodeType → 항상 같은 node ID
- 같은 노드 쌍 + 같은 edgeType → 항상 같은 edge ID
- RawItem 삭제 후 recomputeGraph 시, 살아남는 node/edge는 같은 ID 유지
- FeedbackEvent.targetId가 재계산 후에도 같은 neuron/synapse에 계속 적용됨

**normalizeLabel:**

```ts
function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}
```

---

## 8. BrainNodeViewModel / BrainEdgeViewModel = UI-Only Types

파일: `src/components/brainMapTypes.ts`

### Principle

- `BrainNodeViewModel`과 `BrainEdgeViewModel`은 도메인 타입이 아니다.
- 3D 렌더링 전용 타입이다.
- `src/domain/types.ts`에 넣지 않는다.
- `src/components/brainMapTypes.ts`에 분리한다.
- IndexedDB에 저장하지 않는다.
- d3-force-3d가 mutate해도 도메인 데이터는 안전하다.

### Data Flow

```text
IndexedDB (GraphNode/GraphEdge)
  → Zustand store (캐시)
    → useMemo: toNodeViewModels() / toEdgeViewModels()
      → d3-force-3d simulation (mutates x,y,z; replaces source/target string → object)
        → useFrame: Three.js mesh position sync
          → SynapseEdge: resolveBrainNode(edge.source/target) for position
```

도메인 데이터는 읽기 전용으로만 참조된다. d3-force-3d는 ViewModel만 mutate한다.

---

## 9. Worldview Brain Map 3D Implementation

### Technology

- React Three Fiber + Three.js + d3-force-3d
- @react-three/drei for OrbitControls, Billboard, Text

### Components

| Component | Role |
|-----------|------|
| WorldviewBrainMap | Full-screen overlay, Canvas, simulation |
| BrainShell | Translucent cortex/sphere boundary |
| KeywordNeuron | Selectable 3D sphere node |
| SynapseEdge | Selectable 3D cylinder/tube edge |
| BrainMapInspector | Info + edit panel (HTML overlay) |

### Visual Mapping

**KeywordNeuron:**
- size = strength
- brightness = confidence
- pulse = recency
- Billboard label

**SynapseEdge:**
- thickness = strength
- opacity = confidence
- color = edgeType별 accent
- Cylinder/Tube mesh for raycasting

**BrainShell:**
- abstract, translucent, non-human
- 뉴런들을 감싸는 크기

### Interaction

- Camera orbit/zoom/pan (OrbitControls)
- Node hover/click → selectNode
- Edge hover/click → selectEdge
- View Mode / Feedback Mode toggle
- Edge picking: cylinder/tube mesh로 raycasting

### Modes

**View Mode:** 노드/엣지 선택 + 정보 확인

**Feedback Mode:** 노드/엣지 선택 + 수정 액션 (weaken, remove, rename, pin)

---

## 10. localHeuristicAdapter Live Data Principle

### Rule

> 매 generateReply() 호출 시 반드시 인자로 받은 최신 JudgmentCard, GraphNode, GraphEdge, FeedbackEvent, AgentProfile을 읽고 답변을 구성해야 한다.

### Why

- Feedback Mode에서 edge weaken/remove 후 다음 답변이 실제로 달라져야 한다.
- 새 데이터 추가 후 답변이 새 데이터를 반영해야 한다.
- 고정 스크립트만으로는 이 요구사항을 충족할 수 없다.

### How

1. ChatPanel이 매 응답 전 IndexedDB에서 최신 데이터를 다시 로드한다.
2. 최신 데이터를 generateReply() 인자로 전달한다.
3. localHeuristicAdapter는 이 인자를 사용하여:
   - cards를 strength 내림차순 정렬
   - userRejected 카드 제외
   - feedbackEvents에서 weakened/removed edge의 키워드 가중치 감소
   - 상위 키워드 3~5개 기반으로 snippet 동적 조합

### Template vs Script

- **Allowed:** 키워드별 snippet 템플릿 풀 (예: "hologram" → "빛나는 인터페이스...")
- **Allowed:** formationStage에 따른 톤 조절
- **Prohibited:** formationStage만으로 전체 답변을 결정하는 고정 스크립트
- **Prohibited:** 데이터를 읽지 않고 미리 작성된 문장 그대로 반환

---

## 11. BrainMapInspector UX: No Developer Info

### Principle

> sourceCardIds, raw confidence 숫자, 내부 ID 같은 개발자용 정보는 기본 UI에 노출하지 않는다.
> strength/confidence는 뉴런 크기, 밝기, 엣지 두께/투명도로 이미 시각화되어 있다.

### What To Show

**Node selected:**
- Keyword label (큰 텍스트)
- NodeType 한국어 레이블
- 반복 등장 여부 자연어 ("여러 저장물에서 반복 등장했어요")
- 형성 강도 자연어 ("강하게 형성됨" / "아직 약한 신호")

**Edge selected:**
- 연결된 두 keyword: "A ↔ B"
- EdgeType 한국어 레이블
- 연결 강도 자연어 ("강한 연결" / "약한 연결")

### What NOT To Show

- Internal IDs (node id, edge id, card id)
- sourceCardIds array
- confidence decimal numbers
- strength decimal numbers
- createdAt / updatedAt timestamps

### Action Buttons (Feedback Mode)

- "이 연결 약하게 하기"
- "이 연결 끊기"
- "이름 바꾸기"
- "중요 표시"

---

## 12. Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Scaffold Vite+React+TS+PWA | package.json, vite.config.ts, tsconfig.json, index.html |
| 2 | Install dependencies | package.json |
| 3 | Define domain types | domain/types.ts |
| 4 | Define Dexie schema + repositories (pure CRUD) | db/dexie.ts, db/repositories.ts |
| 5 | Build Zustand store | state/useSnapMindStore.ts |
| 6 | Build Home, AgentCore, SnapBar, ChatPanel | app/App.tsx, routes.tsx, components/* |
| 7 | Implement RawItem creation + GTV storage | components/SnapBar.tsx |
| 8 | Implement agentAdapter + localHeuristicAdapter | ai/agentAdapter.ts, ai/localHeuristicAdapter.ts |
| 9 | Implement extractors | processing/extractors.ts |
| 10 | Implement cardBuilder | processing/cardBuilder.ts |
| 11 | Implement Graph Scoring Engine + graph rules | domain/scoring.ts, domain/graph.ts |
| 12 | Implement graphBuilder (buildGraph + recomputeGraph) | processing/graphBuilder.ts |
| 13 | Implement AgentProfile formation | domain/formation.ts |
| 14 | Implement processRawItem pipeline | processing/pipeline.ts |
| 15 | Implement deleteRawItemAndRecompute | processing/deleteRawItem.ts |
| 16 | Add demo seed flow | demo/seedItems.ts, demo/demoScenario.ts |
| 17 | Define brainMapTypes (ViewModel) | components/brainMapTypes.ts |
| 18 | Build WorldviewBrainMap R3F scene | components/WorldviewBrainMap.tsx |
| 19 | Build BrainShell, KeywordNeuron, SynapseEdge | components/BrainShell.tsx, KeywordNeuron.tsx, SynapseEdge.tsx |
| 20 | Add node/edge picking + BrainMapInspector | components/BrainMapInspector.tsx, NodeEditor.tsx |
| 21 | Implement Feedback Mode + FeedbackEvent | components/BrainMapInspector.tsx |
| 22 | Make next answer reflect feedback (live data) | ai/localHeuristicAdapter.ts |
| 23 | Polish visual design + responsiveness | CSS, components |
| 24 | Run acceptance checklist | -- |

---

## 13. Final Verification Checklist

### Project Setup

- [ ] App runs locally with one command
- [ ] No external AI key required for default demo
- [ ] Vite + React + TypeScript configured
- [ ] Dexie/IndexedDB configured
- [ ] Zustand configured
- [ ] React Three Fiber, Three.js, d3-force-3d configured

### Feed

- [ ] User can add text without choosing a category
- [ ] User can upload an image without choosing a category
- [ ] User can upload a file without choosing a category
- [ ] RawItem is saved before processing
- [ ] Original blob/text stored separately from derived data

### Form

- [ ] processRawItem exists and works
- [ ] Signals are created
- [ ] Judgment Cards are created
- [ ] GraphNodes are created with deterministic IDs
- [ ] GraphEdges are created with deterministic IDs
- [ ] AgentProfile changes after input
- [ ] Low-confidence stays internal (no user-facing questions)

### Talk

- [ ] Chat UI exists on main surface
- [ ] Before-data answer is generic
- [ ] After-data answer reflects saved material
- [ ] Same question differs before/after formation
- [ ] Default answers do not show source IDs, confidence scores, or analysis reports
- [ ] localHeuristicAdapter reads live data for every response

### Worldview Brain Map

- [ ] User can enter map through long-press, right-click, or secondary control
- [ ] Map is not the default main flow
- [ ] 3D brain/cortex-like shell renders
- [ ] Keyword neurons render as selectable 3D nodes
- [ ] Synapse edges render as selectable 3D lines/tubes
- [ ] Edge strength visible through thickness/opacity
- [ ] User can select a node
- [ ] User can select an edge
- [ ] BrainMapInspector shows human-readable info (no raw IDs/scores)
- [ ] BrainNodeViewModel/BrainEdgeViewModel separate from domain data

### Feedback

- [ ] User can weaken an edge
- [ ] User can remove an edge
- [ ] FeedbackEvent is stored
- [ ] Edge weaken: strength *= 0.35, userFeedback = "weakened"
- [ ] Edge remove: strength = 0.05, userFeedback = "removed"
- [ ] AgentProfile recomputed after feedback

### Return

- [ ] Next answer reflects changed graph
- [ ] Removed/weakened connections not heavily reused immediately
- [ ] Feedback changes persist across Brain Map close/reopen

### Deletion

- [ ] repositories.ts is pure CRUD (no business logic)
- [ ] deleteRawItemAndRecompute orchestrates deletion properly
- [ ] Signal/Card deleted, then graph recomputed from remaining cards
- [ ] Nodes/edges from other sources survive deletion
- [ ] FeedbackEvent.targetId remains valid after recomputation (deterministic IDs)

### Demo Scenario

- [ ] Before-data question gets generic answer
- [ ] Demo seed items can be added quickly
- [ ] Agent visibly forms after seed items
- [ ] After-formation answer reflects saved material
- [ ] User can say "너무 홀로그램 쪽으로만 가는 건 별로야"
- [ ] User can weaken/remove holographic edge in Brain Map
- [ ] After-feedback answer changes accordingly

### Visual

- [ ] First screen is the app, not a landing page
- [ ] Abstract Agent is non-human and non-mascot
- [ ] UI avoids one-note purple/blue gradient
- [ ] Agent visually changes as data is added
- [ ] Text does not overflow on mobile

### Red Flags (STOP if any occurs)

- [ ] Main demo becomes file search
- [ ] App asks user to tag/categorize at capture time
- [ ] App asks clarifying questions because confidence is low
- [ ] Agent answers like generic chatbot after data is added
- [ ] Brain Map becomes primary flow instead of feedback surface
- [ ] Internal map looks like generic file graph
- [ ] UI feels like AI companion/mascot
- [ ] Originals not recoverable after processing
- [ ] Feedback does not affect later conversation
- [ ] localHeuristicAdapter returns fixed scripts without reading live data
- [ ] BrainMapInspector exposes raw IDs or decimal scores

---

## File Count Summary

| Directory | Count | Files |
|-----------|-------|-------|
| src/app/ | 2 | App.tsx, routes.tsx |
| src/components/ | 11 | AgentCore, SnapBar, ChatPanel, FeedPreview, WorldviewBrainMap, BrainShell, KeywordNeuron, SynapseEdge, BrainMapInspector, NodeEditor, brainMapTypes |
| src/db/ | 2 | dexie.ts, repositories.ts |
| src/domain/ | 4 | types.ts, scoring.ts, graph.ts, formation.ts |
| src/processing/ | 5 | pipeline.ts, extractors.ts, cardBuilder.ts, graphBuilder.ts, deleteRawItem.ts |
| src/ai/ | 3 | agentAdapter.ts, localHeuristicAdapter.ts, apiAdapter.ts |
| src/state/ | 1 | useSnapMindStore.ts |
| src/demo/ | 2 | seedItems.ts, demoScenario.ts |
| **Total** | **30** | |

---

Final confirmation sentence:

> SnapMind는 저장물을 검색하는 앱이 아니라, 저장물이 Agent가 되는 앱이다.
