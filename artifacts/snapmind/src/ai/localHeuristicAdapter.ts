import type { AgentAdapter } from './agentAdapter';

export const localHeuristicAdapter: AgentAdapter = {
  async generateReply(userMessage, profile, cards, nodes, edges, feedbackEvents) {
    if (profile.formationStage === "empty") {
      return "안녕해. 뭔가 저장하면 내가 형성돼. 지금 바로 넣어봐.";
    }

    const isNegativeFeedback = userMessage.includes("별로") || userMessage.includes("아닌데") || userMessage.includes("틀렸");
    
    if (isNegativeFeedback) {
      return "알겠어, 내가 잘못 짚었네. Brain Map을 열어서 잘못된 연결을 끊어줄래?";
    }

    // Sort cards by strength
    const validCards = cards
      .filter(c => !c.userRejected)
      .sort((a, b) => b.strength - a.strength);

    // Apply feedback weights (naive implementation for MVP)
    const activeKeywords = validCards.slice(0, 3).map(c => c.signal.toLowerCase());

    const snippets: Record<string, string> = {
      "hologram": "빛나는 인터페이스에 끌리는 감각이 있어. 반투명하고 겹겹이 쌓이는 시각적 레이어가 반복되고 있어.",
      "constellation": "연결과 패턴을 직관적으로 보는 방식이 형성되고 있어. 개별 점보다 관계에 더 끌리는 것 같아.",
      "brain": "인지와 기억에 관한 관심이 쌓이고 있어. 어떻게 정보가 연결되는지 궁금한 것 같아.",
      "neuron": "인지와 기억에 관한 관심이 쌓이고 있어. 어떻게 정보가 연결되는지 궁금한 것 같아.",
      "agent": "개인화된 AI, 나만의 에이전트에 대한 생각이 반복되고 있어.",
      "privacy": "데이터 주권과 프라이버시에 대한 관심이 강하게 형성되어 있어.",
      "local": "로컬 우선 철학이 반복적으로 등장해. 통제와 신뢰가 중요한 것 같아.",
      "memory": "기억과 저장에 대한 관심이 있어. 무엇을 기억할지, 어떻게 간직할지.",
      "quiet": "조용하고 집중된 환경을 중요하게 여기는 것 같아.",
      "worldview": "개인적인 세계관과 시각을 구체화하는 것에 관심이 있어."
    };

    let response = "";
    for (const kw of activeKeywords) {
      const match = Object.keys(snippets).find(k => kw.includes(k));
      if (match) {
        response += snippets[match] + " ";
      }
    }

    if (!response) {
      response = "저장된 내용들이 조금씩 연결되고 있어. 더 쌓이면 더 선명해질 거야.";
    }

    return response.trim();
  }
};