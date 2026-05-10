export type RawItem = {
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

export type MultimodalSignal = {
  id: string;
  itemId: string;
  kind: "ocr_text" | "file_text" | "visual_caption" | "keyword" | "aesthetic" | "intent" | "metadata";
  value: string;
  confidence: number;
  createdAt: string;
};

export type JudgmentCard = {
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

export type GraphNode = {
  id: string;
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

export type GraphEdge = {
  id: string;
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

export type FeedbackEvent = {
  id: string;
  createdAt: string;
  targetType: "node" | "edge" | "card";
  targetId: string;
  action: "weaken" | "remove" | "rename" | "merge" | "pin" | "detach_item";
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
};

export type AgentProfile = {
  id: "local-agent";
  formationStage: "empty" | "seed" | "emerging" | "personal_worldview";
  dominantSignals: string[];
  summaryForAgent: string;
  lastFormedAt?: string;
  itemCount: number;
  cardCount: number;
  feedbackCount: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  relatedItemIds?: string[];
  sourceCardIds?: string[];
};