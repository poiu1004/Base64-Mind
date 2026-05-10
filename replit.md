# SnapMind

SnapMind transforms what you save — text, images, files — into a personal AI Agent that knows you, expressed as a living 3D knowledge graph.

## Run & Operate

- `pnpm --filter @workspace/snapmind run dev` — run the web app (port 21517)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4
- Local storage: Dexie (IndexedDB wrapper) — no backend needed for the app
- State: Zustand
- 3D Brain Map: pure vanilla Three.js + d3-force-3d (NOT React Three Fiber)
- API server: Express 5 (health check only)
- Build: Vite

## Where things live

```
artifacts/snapmind/src/
  domain/         — types.ts, scoring.ts, graph.ts, formation.ts
  db/             — dexie.ts (schema), repositories.ts (pure CRUD)
  state/          — useSnapMindStore.ts (Zustand)
  processing/     — extractors.ts, cardBuilder.ts, graphBuilder.ts, pipeline.ts, deleteRawItem.ts
  ai/             — agentAdapter.ts, localHeuristicAdapter.ts, apiAdapter.ts
  components/     — AgentCore, SnapBar, ChatPanel, FeedPreview, WorldviewBrainMap,
                    BrainMapInspector, NodeEditor, brainMapTypes.ts
  demo/           — seedItems.ts, demoScenario.ts
  app/            — App.tsx
```

## Architecture decisions

- **All local, no backend**: SnapMind uses IndexedDB (Dexie) for all storage. No API calls, no database server needed.
- **Deterministic IDs**: GraphNode IDs = `node:{normalizedLabel}:{nodeType}`, GraphEdge IDs = `edge:{sortedA}:{sortedB}:{edgeType}`. This keeps FeedbackEvents valid across graph recomputes.
- **Pure Three.js Brain Map**: The 3D Worldview uses vanilla Three.js imperative rendering (not R3F) to avoid "Cannot read properties of undefined (reading 'source')" bugs that occurred with R3F in the original Base44 build.
- **ViewModel separation**: BrainNodeViewModel/BrainEdgeViewModel are 3D-only types that d3-force-3d mutates — domain GraphNode/GraphEdge are never passed to d3 directly.
- **Live data principle**: localHeuristicAdapter always reads the fresh arguments (cards, nodes, edges, feedbackEvents) passed per-call — never returns fixed scripts.

## Product

- **Feed**: Add text, images, files without any tagging/categorization
- **Form**: Automatic pipeline: RawItem → Signals → JudgmentCards → GraphNodes/Edges → AgentProfile
- **Talk**: Chat with the Agent; answers change as more data is added
- **Brain Map**: 3D visualization of keyword neurons (nodes) and synapse connections (edges)
- **Feedback**: Weaken or remove connections in Brain Map; affects next conversation response
- **Demo**: "데모 데이터 추가" button loads 5 seed items immediately

## User preferences

- Web app (not mobile)
- 3D Brain Map = pure Three.js (NOT React Three Fiber)
- Korean UI language
- Always dark theme
- No tag/category UI at input time
- No source IDs or confidence scores in chat responses
- No clarifying questions when confidence is low

## Gotchas

- The Brain Map runs d3-force-3d simulation synchronously for 150 ticks before rendering (for fast stabilization)
- Edge deduplication uses sorted node IDs in makeEdgeId to avoid directional duplicates
- processRawItem for demo_seed items reads from DEMO_SEED_SIGNALS map first before generic extraction
- Three.js OrbitControls import path: `three/examples/jsm/controls/OrbitControls.js` (with .js extension)
- d3-force-3d is different from d3-force — it adds z coordinates and needs `numDimensions: 3`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
