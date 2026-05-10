import { v4 as uuidv4 } from 'uuid';
import type { RawItem, MultimodalSignal } from '../domain/types';

export function extractSignals(item: RawItem, blob?: Blob): MultimodalSignal[] {
  const signals: MultimodalSignal[] = [];
  const now = new Date().toISOString();

  const addSignal = (kind: MultimodalSignal["kind"], value: string, confidence: number) => {
    if (value.trim()) {
      signals.push({
        id: uuidv4(),
        itemId: item.id,
        kind,
        value: value.trim(),
        confidence,
        createdAt: now
      });
    }
  };

  if (item.textContent) {
    const text = item.textContent.toLowerCase();
    addSignal("file_text", text, 0.9);
    
    // Very naive keyword extraction for MVP
    const keywords = ["idea", "project", "design", "tech", "local", "memory", "privacy", "agent", "brain"];
    for (const kw of keywords) {
      if (text.includes(kw)) addSignal("keyword", kw, 0.7);
    }
  }

  if (item.fileName) {
    const lowerName = item.fileName.toLowerCase();
    addSignal("metadata", `filename:${item.fileName}`, 1.0);
    
    // Fake matching for MVP
    if (lowerName.includes("hologram") || lowerName.includes("neon")) {
      addSignal("aesthetic", "cyberpunk/neon", 0.8);
    }
    if (lowerName.includes("constellation") || lowerName.includes("brain")) {
      addSignal("keyword", "network/connections", 0.8);
    }
  }

  if (item.userNote) {
    addSignal("intent", item.userNote, 0.95);
  }

  // Fallback
  if (signals.length === 0) {
    addSignal("metadata", "generic_item", 0.3);
  }

  return signals;
}