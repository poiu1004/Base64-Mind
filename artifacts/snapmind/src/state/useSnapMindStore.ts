import { create } from 'zustand';
import type { AgentProfile, ChatMessage, GraphNode, GraphEdge, JudgmentCard } from '../domain/types';
import { profileRepo, chatRepo, nodeRepo, edgeRepo, cardRepo } from '../db/repositories';

interface SnapMindState {
  agentProfile: AgentProfile | null;
  messages: ChatMessage[];
  isAgentThinking: boolean;
  
  isBrainMapOpen: boolean;
  brainMapMode: 'view' | 'feedback';
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  isProcessing: boolean;
  processingItemId: string | null;
  
  nodes: GraphNode[];
  edges: GraphEdge[];
  cards: JudgmentCard[];
  
  openBrainMap: () => void;
  closeBrainMap: () => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setMode: (mode: 'view' | 'feedback') => void;
  refreshFromDb: () => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  setIsProcessing: (isProcessing: boolean, itemId?: string | null) => void;
  setIsAgentThinking: (thinking: boolean) => void;
}

export const useSnapMindStore = create<SnapMindState>((set, get) => ({
  agentProfile: null,
  messages: [],
  isAgentThinking: false,
  
  isBrainMapOpen: false,
  brainMapMode: 'view',
  selectedNodeId: null,
  selectedEdgeId: null,
  
  isProcessing: false,
  processingItemId: null,
  
  nodes: [],
  edges: [],
  cards: [],
  
  openBrainMap: () => set({ isBrainMapOpen: true }),
  closeBrainMap: () => set({ isBrainMapOpen: false }),
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setMode: (mode) => set({ brainMapMode: mode }),
  
  refreshFromDb: async () => {
    const profile = await profileRepo.get();
    const messages = await chatRepo.getAll();
    const nodes = await nodeRepo.getAll();
    const edges = await edgeRepo.getAll();
    const cards = await cardRepo.getAll();
    
    set({
      agentProfile: profile || null,
      messages,
      nodes,
      edges,
      cards
    });
  },
  
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setIsProcessing: (isProcessing, itemId = null) => set({ isProcessing, processingItemId: itemId }),
  setIsAgentThinking: (thinking) => set({ isAgentThinking: thinking })
}));