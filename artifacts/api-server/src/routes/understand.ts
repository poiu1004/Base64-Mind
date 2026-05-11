import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const VISION_SYSTEM_PROMPT = `You are an image understanding AI for a personal knowledge management system.
Analyze the provided image and return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "caption": "one sentence describing what's in the image",
  "visibleText": ["any text visible in the image"],
  "objects": ["physical objects, UI elements, or items detected"],
  "scene": "brief scene description (e.g. 'dark mode UI screenshot', 'outdoor landscape')",
  "style": ["visual style descriptors e.g. minimalist, brutalist, neon, organic"],
  "aesthetics": ["aesthetic qualities e.g. dark, light, colorful, monochrome, futuristic"],
  "mood": ["mood/atmosphere e.g. calm, energetic, mysterious, warm"],
  "colors": ["dominant colors"],
  "composition": ["composition notes e.g. centered, asymmetric, grid-based"],
  "keywords": ["5-10 concise keywords capturing the essence"],
  "inferredUserInterest": ["what this suggests about the user's interests"],
  "possibleUseCases": ["possible reasons the user saved this"]
}
All values must be in Korean or English. Prefer Korean for aesthetic/mood/interest descriptions.`;

const TEXT_SYSTEM_PROMPT = `You are a semantic analysis AI for a personal knowledge management system.
Analyze the provided text and return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "topics": ["main topics or themes"],
  "keywords": ["5-10 concise keywords"],
  "mood": ["tone or mood of the text"],
  "inferredUserInterest": ["what this suggests about the user's interests"],
  "possibleUseCases": ["possible reasons the user saved this"],
  "summary": "one sentence summary in Korean"
}
All descriptions in Korean where possible.`;

const CHAT_SYSTEM_PROMPT = `당신은 사용자의 저장물에서 형성된 개인 AI 에이전트입니다.
사용자가 저장한 이미지, 텍스트, 파일들을 분석한 JudgmentCard들과 GraphNode들을 기반으로 대화합니다.

규칙:
- 출처(파일명, ID)를 노출하지 않습니다.
- confidence가 낮아도 clarifying question을 하지 않습니다.
- 구체적이고 개인화된 답변을 합니다.
- 한국어로 답합니다.
- 2-4문장 이내로 간결하게 답합니다.`;

router.post("/vision", async (req, res) => {
  const { imageBase64, mimeType } = req.body as {
    imageBase64: string;
    mimeType?: string;
  };

  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 required" });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: VISION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    res.json({ success: true, result: parsed });
  } catch (err: unknown) {
    req.log.warn({ err }, "Vision API failed");
    const isRateLimit =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 429;
    res.status(isRateLimit ? 429 : 502).json({
      success: false,
      error: isRateLimit ? "rate_limit" : "api_error",
    });
  }
});

router.post("/text", async (req, res) => {
  const { text } = req.body as { text: string };

  if (!text) {
    res.status(400).json({ error: "text required" });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: TEXT_SYSTEM_PROMPT },
        {
          role: "user",
          content: text.slice(0, 2000),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    res.json({ success: true, result: parsed });
  } catch (err: unknown) {
    req.log.warn({ err }, "Text understanding API failed");
    const isRateLimit =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 429;
    res.status(isRateLimit ? 429 : 502).json({
      success: false,
      error: isRateLimit ? "rate_limit" : "api_error",
    });
  }
});

router.post("/chat", async (req, res) => {
  const { userMessage, context } = req.body as {
    userMessage: string;
    context: {
      formationStage: string;
      dominantSignals: string[];
      topCards: Array<{ description: string; strength: number }>;
      topNodes: Array<{ label: string; nodeType: string; strength: number }>;
      topEdges: Array<{
        sourceLabel: string;
        targetLabel: string;
        strength: number;
      }>;
      recentVisualCaptions: string[];
    };
  };

  if (!userMessage) {
    res.status(400).json({ error: "userMessage required" });
    return;
  }

  const contextStr = `
형성 단계: ${context?.formationStage ?? "unknown"}
주요 신호: ${context?.dominantSignals?.join(", ") ?? "없음"}
최근 이미지 분석 결과: ${context?.recentVisualCaptions?.slice(0, 3).join(" / ") ?? "없음"}
상위 카드:
${context?.topCards
  ?.slice(0, 4)
  .map((c) => `- ${c.description} (강도: ${c.strength.toFixed(2)})`)
  .join("\n") ?? "없음"}
상위 노드:
${context?.topNodes
  ?.slice(0, 5)
  .map((n) => `- ${n.label} [${n.nodeType}] (강도: ${n.strength.toFixed(2)})`)
  .join("\n") ?? "없음"}
강한 연결:
${context?.topEdges
  ?.slice(0, 3)
  .map((e) => `- ${e.sourceLabel} ↔ ${e.targetLabel} (강도: ${e.strength.toFixed(2)})`)
  .join("\n") ?? "없음"}
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `[저장물 분석 결과]\n${contextStr}\n\n[사용자 질문]\n${userMessage}`,
        },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? "";
    res.json({ success: true, reply });
  } catch (err: unknown) {
    req.log.warn({ err }, "Chat API failed");
    const isRateLimit =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 429;
    res.status(isRateLimit ? 429 : 502).json({
      success: false,
      error: isRateLimit ? "rate_limit" : "api_error",
    });
  }
});

export default router;
