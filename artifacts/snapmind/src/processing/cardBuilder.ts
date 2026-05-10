import { v4 as uuidv4 } from 'uuid';
import type { MultimodalSignal, JudgmentCard } from '../domain/types';

export function buildCards(signals: MultimodalSignal[], existingCards: JudgmentCard[]): JudgmentCard[] {
  const cards: JudgmentCard[] = [];
  const now = new Date().toISOString();

  const getCardType = (kind: MultimodalSignal["kind"]): JudgmentCard["type"] => {
    switch (kind) {
      case "aesthetic": return "aesthetic_reference";
      case "intent": return "project_signal";
      case "keyword": return "interest_signal";
      case "visual_caption": return "evidence_record";
      case "metadata": return "evidence_record";
      default: return "interest_signal";
    }
  };

  for (const signal of signals) {
    const existing = existingCards.find(c => c.signal === signal.value && c.type === getCardType(signal.kind));
    
    if (existing) {
      cards.push({
        ...existing,
        sourceItemIds: [...new Set([...existing.sourceItemIds, signal.itemId])],
        sourceCount: existing.sourceCount + 1,
        strength: Math.min(existing.strength + 0.1, 1.0),
        updatedAt: now
      });
    } else {
      cards.push({
        id: uuidv4(),
        type: getCardType(signal.kind),
        signal: signal.value,
        description: `Derived from ${signal.kind}`,
        sourceItemIds: [signal.itemId],
        strength: signal.confidence * 0.5,
        confidence: signal.confidence,
        sourceCount: 1,
        recency: "high",
        userConfirmed: false,
        userRejected: false,
        usableFor: [],
        createdAt: now,
        updatedAt: now
      });
    }
  }

  return cards;
}