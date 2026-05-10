import type { RawItem, JudgmentCard, GraphNode, GraphEdge, FeedbackEvent, AgentProfile } from "./types";

export function recomputeAgentProfile(
  items: RawItem[],
  cards: JudgmentCard[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  feedback: FeedbackEvent[]
): AgentProfile {
  let stage: AgentProfile["formationStage"] = "empty";
  
  const highStrengthCards = cards.filter(c => c.strength > 0.6);
  
  if (items.length === 0) {
    stage = "empty";
  } else if (items.length >= 2 && cards.some(c => c.sourceCount >= 2)) {
    stage = highStrengthCards.length >= 5 ? "personal_worldview" : "emerging";
  } else if (items.length >= 1) {
    stage = "seed";
  }

  const dominantSignals = highStrengthCards
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map(c => c.signal);
    
  let summary = "";
  if (stage === "empty") summary = "아직 아무것도 없어.";
  else if (stage === "seed") summary = "이제 막 첫 조각들이 모이기 시작했어.";
  else if (stage === "emerging") summary = "정보들이 서로 연결되며 패턴을 만들고 있어.";
  else summary = "너만의 고유한 세계관이 꽤 뚜렷하게 잡혔어.";

  return {
    id: "local-agent",
    formationStage: stage,
    dominantSignals,
    summaryForAgent: summary,
    lastFormedAt: new Date().toISOString(),
    itemCount: items.length,
    cardCount: cards.length,
    feedbackCount: feedback.length
  };
}