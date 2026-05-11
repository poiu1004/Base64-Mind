# SnapMind API-Assisted Understanding Plan

이 문서는 SnapMind MVP의 API-assisted understanding 전환 기준을 정의한다.

docs/10, docs/11의 API/이미지 처리 관련 기준을 이 문서가 supersede한다.

---

## 1. 핵심 전환: 원본 저장은 local-first, 의미 해석은 API-assisted

SnapMind의 핵심 구조는 유지한다:

- Feed → Form → Talk → Feedback → Return 루프
- Ground-Truth Vault (원본 우선)
- deterministic GraphNode/GraphEdge IDs
- ViewModel 분리 (BrainNodeViewModel/BrainEdgeViewModel)
- delete/recompute 패턴
- Worldview Brain Map은 3D (파일 그래프가 아닌 keyword neuron 구조)

변경되는 것:

- `localHeuristicAdapter`가 더 이상 MVP 품질의 기본 경로가 아니다.
- **API-assisted understanding이 primary 처리 경로**이고, `localHeuristicAdapter`는 fallback이다.
- "No external AI key required" → **"No API key exposed in frontend"**

---

## 2. 7가지 원칙

### 원칙 1: localHeuristicAdapter는 fallback

API-assisted understanding이 primary 처리 경로다. localHeuristicAdapter는 다음 상황에서만 동작한다:

- API 호출 실패
- rate limit 초과
- 오프라인 환경
- API 키 미설정

API가 정상 동작할 때는 API 결과가 신호 추출과 대화 응답의 기본 품질을 결정한다.

### 원칙 2: API 키는 프론트엔드에 노출하지 않는다

API 키 보호 구조:

```text
Frontend → Base44 Backend Action → Vision API / LLM API
                또는
Frontend → Supabase Edge Function → Vision API / LLM API
                또는
Frontend → Serverless Proxy → Vision API / LLM API
```

프론트엔드 공개 코드에 API 키를 넣지 않는다.

Base44 플랫폼에서는 **Base44 backend action**을 사용한다.

### 원칙 3: Vision API로 이미지를 구조화된 JSON으로 추출

이미지 처리 시 Vision API에 이미지를 전송하고, 아래 구조의 JSON을 반환받는다:

```ts
type VisionApiResult = {
  caption: string;
  visibleText: string[];        // OCR 결과
  objects: string[];             // 인식된 객체
  scene: string;                 // 장면 설명
  style: string[];               // 시각적 스타일
  aesthetics: string[];          // 미적 감각
  mood: string[];                // 무드/분위기
  colors: string[];              // 색상
  composition: string[];         // 구성
  keywords: string[];            // 핵심 키워드
  inferredUserInterest: string[];// 추론된 사용자 관심사
  possibleUseCases: string[];    // 가능한 용도
};
```

이 결과를 기존 `MultimodalSignal` 타입으로 매핑한다:

| VisionApiResult 필드 | MultimodalSignal.kind |
|----------------------|-----------------------|
| caption | visual_caption |
| visibleText | ocr_text |
| objects | keyword |
| scene | keyword |
| style | aesthetic |
| aesthetics | aesthetic |
| mood | aesthetic |
| colors | aesthetic |
| keywords | keyword |
| inferredUserInterest | intent |
| possibleUseCases | intent |

### 원칙 4: API 결과는 원본을 대체하지 않는다

Ground-Truth Vault 원칙은 유지한다.

- API 결과는 원본 위에 쌓이는 **해석 레이어**다.
- 원본 이미지, 텍스트, 파일은 삭제되거나 덮어쓰여지지 않는다.
- API 결과로 생성된 Signal, Card, Node, Edge는 `sourceItemIds`를 통해 원본과 연결된다.
- 원본 삭제 시 관련 파생 데이터(API 결과 포함)도 삭제/약화된다.

### 원칙 5: localHeuristicAdapter는 fallback 전용

localHeuristicAdapter가 동작하는 조건:

1. API 호출 실패 (네트워크 에러, 서버 에러)
2. rate limit 초과
3. 오프라인 환경
4. API 키 미설정

fallback 시 사용하는 신호 소스:

- canvas 기반 이미지 분석 (80x80 HSL 색감 분석)
- 파일명 키워드 매칭
- 사용자 텍스트/노트
- demo seed 사전 정의 신호

fallback임을 사용자에게 노출할 필요는 없다. 내부적으로 처리한다.

### 원칙 6: Acceptance Checklist 변경

**기존:** "No external AI key is required for the default demo"

**변경:** "No API key is exposed in public frontend code"

추가 체크 항목:

- [ ] API 키는 프론트엔드 코드에 포함되지 않는다.
- [ ] API 호출은 Base44 backend action / Supabase Edge Function / serverless proxy를 경유한다.
- [ ] API 실패 시 localHeuristicAdapter로 graceful fallback한다.
- [ ] API 결과는 Ground-Truth Vault의 원본을 대체하지 않는다.
- [ ] Vision API 결과는 기존 MultimodalSignal 타입으로 매핑된다.

### 원칙 7: Low-confidence는 내부 처리 (변경 없음)

이 원칙은 API-assisted 전환 이전과 동일하다.

- confidence가 낮아도 사용자에게 clarifying question을 하지 않는다.
- 내부적으로 strength/confidence를 낮추고, neuron/edge 승격을 보류하고, 답변에서 비중을 줄인다.
- 이상하면 사용자가 Worldview Brain Map에서 수정한다.

---

## 3. Base44 Platform Adaptation

### 3-1. Vanilla Three.js 권장

R3F(React Three Fiber)는 Base44에서 호환성 이슈가 있다:

```
TypeError: Cannot read properties of undefined (reading 'source')
```

대응:

- Vanilla Three.js + imperative 초기화 방식을 사용한다.
- 현재 배포된 `WorldviewBrainMap.tsx`는 이미 vanilla Three.js로 구현되어 있다.
- R3F는 Base44 이외 환경에서 사용할 수 있지만, Base44 배포 시에는 vanilla Three.js를 사용한다.

### 3-2. Bulk/Batched Writes

Base44 entity API에는 rate limit이 있다.

대응:

- `processRawItem` 파이프라인에서 signal, card, node, edge를 개별 upsert하는 대신 배열을 모아 batch 처리한다.
- `deleteRawItemAndRecompute`에서도 bulk 삭제 + bulk upsert를 사용한다.
- rate limit 에러 발생 시 exponential backoff를 적용한다.

### 3-3. API Key Proxy via Base44 Backend Action

```text
Frontend
  → Base44 Backend Action (서버 사이드, API 키 보유)
    → OpenAI Vision API / Claude API / 기타 LLM API
```

Base44 backend action 내에서:

1. 프론트엔드에서 이미지 blob 또는 텍스트를 전송받는다.
2. API 키를 사용하여 Vision API / LLM API를 호출한다.
3. 구조화된 JSON 결과를 프론트엔드에 반환한다.

---

## 4. 처리 파이프라인 변경

### 기존 (`processRawItem` in `pipeline.ts`)

```text
1. RawItem 로드
2. blob 로드
3. extractSignals(item, blob) — canvas 기반 local 분석만
4. buildCards
5. buildGraph
6. recomputeAgentProfile
7. mark processed
```

### 변경 후

```text
1. RawItem 로드
2. blob 로드
3. extractSignals(item, blob) — 내부에서:
   a. API-assisted 시도 (Vision API / LLM API via backend proxy)
   b. API 실패 시 → canvas/heuristic fallback
4. buildCards (동일)
5. buildGraph (동일)
6. recomputeAgentProfile (동일)
7. mark processed
```

`extractSignals` 함수 내부에서 API/fallback 분기를 처리한다. 파이프라인의 나머지 단계는 변경되지 않는다.

### Agent 대화 응답

`agentAdapter.ts`의 `getAdapter()`:

```text
1. API adapter 사용 가능? → apiAdapter.generateReply()
2. API 실패 → localHeuristicAdapter.generateReply() (fallback)
```

두 어댑터 모두 같은 인터페이스를 구현한다:

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
```

---

## 5. 보존되는 원칙 (변경 없음)

| 원칙 | 상태 |
|------|------|
| Feed → Form → Talk → Feedback → Return 루프 | 유지 |
| Ground-Truth Vault (원본 우선) | 유지 |
| No User Classification (태그/분류 금지) | 유지 |
| Low Confidence Is Internal | 유지 |
| No Default Sources (출처 비노출) | 유지 |
| Deterministic GraphNode/GraphEdge IDs | 유지 |
| ViewModel 분리 (d3-force-3d mutation 방지) | 유지 |
| delete/recompute 패턴 | 유지 |
| Worldview Brain Map = 3D keyword neuron 구조 | 유지 |
| BrainMapInspector = No Developer Info | 유지 |
| Feedback = weaken/remove, not permanent ban | 유지 |
| Do Not Shrink The MVP | 유지 |

---

## 6. 수정 대상 파일 (코드 구현 시)

| 파일 | 변경 유형 |
|------|-----------|
| `processing/extractors.ts` | API-assisted 시도 + canvas fallback 분기 추가 |
| `ai/agentAdapter.ts` | `getAdapter()` 로직: API primary, local fallback |
| `ai/apiAdapter.ts` | Vision API 호출, LLM 대화 생성 (placeholder → 실제 구현) |
| `ai/localHeuristicAdapter.ts` | fallback 역할 명확화 (코드 변경 최소) |
| `processing/pipeline.ts` | extractSignals의 API/fallback 분기 외에는 변경 없음 |

도메인 타입(`types.ts`), 스코어링(`scoring.ts`), 그래프 빌더(`graphBuilder.ts`), 카드 빌더(`cardBuilder.ts`), 삭제(`deleteRawItem.ts`)는 변경하지 않는다.

---

## 7. 검증 시나리오

1. `IMG_1234.png` (무의미한 파일명) 이미지 업로드
2. Vision API를 통해 의미 있는 signals/cards 생성 확인
   - canvas fallback이었다면: "어둡고 푸른 톤" 수준
   - API-assisted라면: "UI 스크린샷, 다크 모드 인터페이스, 사이드바와 카드 레이아웃" 수준
3. "방금 넣은 이미지에서 뭘 봤어?" → 구체적 답변 확인
4. 추가 이미지 2-3개 업로드
5. "내가 좋아하는 게 뭐야?" → fallback 아닌 구체적 답변 확인
6. Brain Map에서 edge weaken/remove
7. 같은 질문 → 답변 변화 확인
8. API 의도적 실패 시 → localHeuristicAdapter로 graceful fallback 확인

---

## 8. 이 문서의 위치

| 문서 | 역할 |
|------|------|
| docs/10 | AI 개발 도구 전달용 단일 문서 (API-assisted 반영 완료) |
| docs/11 | Base44 구현 계획 (API-assisted 반영 완료) |
| **docs/12 (이 문서)** | API-assisted understanding 전환의 상세 기준. docs/10, 11의 API/이미지 처리 관련 기준을 supersede |

docs/10, 11에서 API-assisted 관련 내용이 이 문서와 충돌할 경우, **이 문서(docs/12)가 우선**한다.

---

Final confirmation sentence:

> SnapMind는 저장물을 검색하는 앱이 아니라, 저장물이 Agent가 되는 앱이다.
> 원본 저장은 local-first, 의미 해석은 API-assisted가 primary다.
