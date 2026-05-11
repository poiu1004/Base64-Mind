import { v4 as uuidv4 } from 'uuid';
import type { RawItem, MultimodalSignal } from '../domain/types';
import { DEMO_SEED_SIGNALS } from '../demo/seedItems';

// ---------------------------------------------------------------------------
// VisionApiResult — matches /api/understand/vision response
// ---------------------------------------------------------------------------

export type VisionApiResult = {
  caption?: string;
  visibleText?: string[];
  objects?: string[];
  scene?: string;
  style?: string[];
  aesthetics?: string[];
  mood?: string[];
  colors?: string[];
  composition?: string[];
  keywords?: string[];
  inferredUserInterest?: string[];
  possibleUseCases?: string[];
};

export type TextApiResult = {
  topics?: string[];
  keywords?: string[];
  mood?: string[];
  inferredUserInterest?: string[];
  possibleUseCases?: string[];
  summary?: string;
};

// ---------------------------------------------------------------------------
// API proxy calls (frontend → api-server → OpenAI, no key in frontend)
// ---------------------------------------------------------------------------

async function callVisionApi(blob: Blob, mimeType?: string): Promise<VisionApiResult | null> {
  try {
    const base64 = await blobToBase64(blob);
    const res = await fetch('/api/understand/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: mimeType ?? blob.type ?? 'image/jpeg',
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; result?: VisionApiResult };
    return data.success ? (data.result ?? null) : null;
  } catch {
    return null;
  }
}

async function callTextApi(text: string): Promise<TextApiResult | null> {
  try {
    const res = await fetch('/api/understand/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; result?: TextApiResult };
    return data.success ? (data.result ?? null) : null;
  } catch {
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Vision API result → MultimodalSignals
// Short-value filtering: skip long sentences as node labels
// ---------------------------------------------------------------------------

function isShortEnough(v: string, maxLen = 20): boolean {
  return v.trim().length > 0 && v.trim().length <= maxLen;
}

function firstClause(s: string, maxLen = 20): string {
  // Take text before first comma/semicolon/period, truncated to maxLen
  return s.split(/[,，;。\s]\s*/)[0].trim().slice(0, maxLen);
}

function visionResultToSignals(
  result: VisionApiResult,
  itemId: string,
  now: string,
  existing: MultimodalSignal[]
): MultimodalSignal[] {
  const signals: MultimodalSignal[] = [];
  const seen = new Set(existing.map(s => `${s.kind}:${s.value}`));

  const add = (kind: MultimodalSignal['kind'], value: string, confidence: number) => {
    const v = (value ?? '').trim();
    if (!v) return;
    const key = `${kind}:${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ id: uuidv4(), itemId, kind, value: v, confidence, createdAt: now });
  };

  // Caption → visual_caption (keep full for description/card, but also extract first clause as keyword)
  if (result.caption) {
    add('visual_caption', result.caption, 0.92);
    // Also add a short scene keyword extracted from caption
    const captionKeyword = firstClause(result.caption, 18);
    if (captionKeyword && captionKeyword !== result.scene) {
      add('keyword', captionKeyword, 0.78);
    }
  }

  // OCR text
  for (const t of result.visibleText ?? []) {
    if (t.trim()) add('ocr_text', t.trim().slice(0, 100), 0.90);
  }

  // Objects — each should be a short noun
  for (const obj of result.objects ?? []) {
    const v = obj.trim();
    if (isShortEnough(v, 20)) add('keyword', v, 0.85);
  }

  // Scene — take only the first clause to keep it short
  if (result.scene) {
    const sceneShort = firstClause(result.scene, 20);
    if (sceneShort) add('keyword', sceneShort, 0.87);
  }

  // Style, Aesthetics, Mood, Colors — visual aesthetic signals
  for (const s of result.style ?? []) {
    if (isShortEnough(s, 20)) add('aesthetic', s.trim(), 0.82);
  }
  for (const a of result.aesthetics ?? []) {
    if (isShortEnough(a, 20)) add('aesthetic', a.trim(), 0.82);
  }
  for (const m of result.mood ?? []) {
    if (isShortEnough(m, 20)) add('aesthetic', m.trim(), 0.78);
  }
  for (const c of result.colors ?? []) {
    if (isShortEnough(c, 15)) add('aesthetic', c.trim(), 0.70);
  }

  // Composition — store as metadata only
  for (const comp of result.composition ?? []) {
    if (comp.trim()) add('metadata', `composition:${comp.trim()}`, 0.55);
  }

  // Keywords — core topic words (keep short)
  for (const kw of result.keywords ?? []) {
    if (isShortEnough(kw, 20)) add('keyword', kw.trim(), 0.83);
  }

  // Inferred user interests
  for (const int of result.inferredUserInterest ?? []) {
    const v = int.trim().slice(0, 50);
    if (v) add('intent', v, 0.88);
  }
  for (const use of result.possibleUseCases ?? []) {
    const v = use.trim().slice(0, 50);
    if (v) add('intent', v, 0.75);
  }

  return signals;
}

function textResultToSignals(
  result: TextApiResult,
  itemId: string,
  now: string,
  existing: MultimodalSignal[]
): MultimodalSignal[] {
  const signals: MultimodalSignal[] = [];
  const seen = new Set(existing.map(s => `${s.kind}:${s.value}`));

  const add = (kind: MultimodalSignal['kind'], value: string, confidence: number) => {
    const v = (value ?? '').trim();
    if (!v) return;
    const key = `${kind}:${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ id: uuidv4(), itemId, kind, value: v, confidence, createdAt: now });
  };

  if (result.summary) add('visual_caption', result.summary.slice(0, 100), 0.90);
  for (const t of result.topics ?? []) {
    if (isShortEnough(t, 25)) add('keyword', t, 0.85);
  }
  for (const kw of result.keywords ?? []) {
    if (isShortEnough(kw, 25)) add('keyword', kw, 0.82);
  }
  for (const m of result.mood ?? []) {
    if (isShortEnough(m, 20)) add('aesthetic', m, 0.75);
  }
  for (const int of result.inferredUserInterest ?? []) {
    add('intent', int.slice(0, 50), 0.88);
  }
  for (const use of result.possibleUseCases ?? []) {
    add('intent', use.slice(0, 50), 0.75);
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Canvas-based local image analysis (fallback only)
// ---------------------------------------------------------------------------

export type ImageUnderstanding = {
  caption: string;
  visibleText: string;
  objects: string[];
  aesthetics: string[];
  mood: string;
  colors: string[];
  composition: string;
  keywords: string[];
  inferredUserInterest: string;
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    case bn: h = ((rn - gn) / d + 4) / 6; break;
  }
  return [h * 360, s, l];
}

async function analyzeImageBlobLocally(blob: Blob): Promise<ImageUnderstanding> {
  const SIZE = 80;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(localFallback()); URL.revokeObjectURL(url); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        URL.revokeObjectURL(url);

        let totalS = 0, totalL = 0;
        const hBuckets = new Array(12).fill(0);
        let darkPixels = 0, lightPixels = 0, saturatedPixels = 0;
        const pixelCount = SIZE * SIZE;

        for (let i = 0; i < data.length; i += 4) {
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          totalS += s; totalL += l;
          hBuckets[Math.floor(h / 30) % 12]++;
          if (l < 0.3) darkPixels++;
          if (l > 0.7) lightPixels++;
          if (s > 0.5) saturatedPixels++;
        }

        const avgS = totalS / pixelCount;
        const darkRatio = darkPixels / pixelCount;
        const lightRatio = lightPixels / pixelCount;
        const saturatedRatio = saturatedPixels / pixelCount;
        const dominantBucket = hBuckets.indexOf(Math.max(...hBuckets));

        const hueDescriptors = ['red','orange-red','amber','yellow-green','green','teal','cyan','blue','indigo','violet','purple','magenta'];
        const dominantHueName = hueDescriptors[dominantBucket];
        const brightness: 'dark'|'medium'|'light' = darkRatio > 0.5 ? 'dark' : lightRatio > 0.5 ? 'light' : 'medium';
        const saturation: 'muted'|'balanced'|'vibrant' = avgS < 0.2 ? 'muted' : avgS > 0.55 ? 'vibrant' : 'balanced';

        const aesthetics: string[] = [];
        const keywords: string[] = [];
        const colors: string[] = [];

        if (dominantBucket >= 6 && dominantBucket <= 9) {
          colors.push('deep blue');
          if (saturation === 'vibrant') { aesthetics.push('holographic','neon-blue'); keywords.push('hologram','neon'); }
          else if (saturation === 'muted') { aesthetics.push('minimal-cool'); keywords.push('minimal'); }
          else { aesthetics.push('cool-tone'); keywords.push('blue'); }
        }
        if (dominantBucket >= 9 && dominantBucket <= 11) {
          colors.push('purple'); aesthetics.push('mystical');
          if (saturation === 'vibrant') { keywords.push('neon'); aesthetics.push('holographic'); }
          else keywords.push('depth');
        }
        if (dominantBucket >= 5 && dominantBucket <= 7) {
          colors.push('teal'); aesthetics.push('futuristic'); keywords.push('connection');
        }
        if (brightness === 'dark') {
          aesthetics.push('dark'); keywords.push('depth');
          if (saturatedRatio > 0.2) { aesthetics.push('dramatic'); keywords.push('contrast'); }
        }
        if (brightness === 'light') { aesthetics.push('bright'); keywords.push('clarity'); }
        if (saturation === 'vibrant') { aesthetics.push('high-contrast'); keywords.push('energy'); }
        if (saturation === 'muted') { aesthetics.push('subdued'); keywords.push('quiet'); }
        if (colors.length === 0) colors.push(dominantHueName);

        let variance = 0;
        const avgR = totalL / pixelCount;
        for (let i = 0; i < data.length; i += 4) { const d2 = data[i] - avgR; variance += d2 * d2; }
        variance = Math.sqrt(variance / pixelCount);
        const composition = variance > 60 ? 'complex/layered' : variance > 30 ? 'structured' : 'minimal';
        if (variance > 55) { keywords.push('complex','layered'); aesthetics.push('network-like'); }
        else if (variance < 25) { keywords.push('minimal'); aesthetics.push('clean'); }

        const moodMap: Record<string,string> = {
          'dark-vibrant':'어둡고 강렬한','dark-muted':'어둡고 차분한','dark-balanced':'차갑고 깊은',
          'medium-vibrant':'선명하고 생동감 있는','medium-muted':'차분하고 절제된','medium-balanced':'균형 잡힌',
          'light-vibrant':'밝고 강렬한','light-muted':'밝고 미니멀한','light-balanced':'맑고 정돈된',
        };
        const mood = moodMap[`${brightness}-${saturation}`] ?? '인상적인';
        const colorLabel = colors[0] ?? dominantHueName;
        const aestheticLabel = aesthetics[0] ?? '독특한';

        resolve({
          caption: `${mood} ${colorLabel} 톤의 이미지. ${aestheticLabel} 느낌의 시각적 구성.`,
          visibleText: '',
          objects: [],
          aesthetics: [...new Set(aesthetics)],
          mood,
          colors: [...new Set(colors)],
          composition,
          keywords: [...new Set(keywords)],
          inferredUserInterest: `${aestheticLabel} 계열의 시각 언어에 반복적으로 끌리는 경향`,
        });
      } catch { URL.revokeObjectURL(url); resolve(localFallback()); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(localFallback()); };
    img.src = url;
  });
}

function localFallback(): ImageUnderstanding {
  return {
    caption: '시각적 참고 이미지',
    visibleText: '',
    objects: [],
    aesthetics: ['visual'],
    mood: '중립적인',
    colors: ['unknown'],
    composition: 'unknown',
    keywords: ['image', 'reference'],
    inferredUserInterest: '시각적 참고 자료 수집',
  };
}

function localImageToSignals(u: ImageUnderstanding, itemId: string, now: string): MultimodalSignal[] {
  const signals: MultimodalSignal[] = [];
  const seen = new Set<string>();
  const add = (kind: MultimodalSignal['kind'], value: string, confidence: number) => {
    const v = value.trim();
    if (!v || seen.has(`${kind}:${v}`)) return;
    seen.add(`${kind}:${v}`);
    signals.push({ id: uuidv4(), itemId, kind, value: v, confidence, createdAt: now });
  };
  add('visual_caption', u.caption, 0.70);
  for (const a of u.aesthetics) add('aesthetic', a, 0.65);
  for (const kw of u.keywords) add('keyword', kw, 0.60);
  for (const c of u.colors) { if (c !== 'unknown') add('aesthetic', c, 0.55); }
  add('intent', u.inferredUserInterest, 0.58);
  if (u.composition && u.composition !== 'unknown') add('metadata', `composition:${u.composition}`, 0.50);
  return signals;
}

// ---------------------------------------------------------------------------
// Text keyword extraction — heuristic fallback for text items
// ---------------------------------------------------------------------------

const KEYWORD_GROUPS: Record<string, { keywords: string[] }> = {
  hologram:    { keywords: ['hologram','holographic','홀로그램','transparent','neon','네온','glow'] },
  constellation: { keywords: ['constellation','별자리','star','cosmos','우주','space','galaxy','은하'] },
  network:     { keywords: ['network','graph','connection','connected','link','연결','node','edge','web'] },
  brain:       { keywords: ['brain','뇌','neuron','뉴런','neural','cognitive','mind','마음','intelligence'] },
  agent:       { keywords: ['agent','에이전트','ai','artificial intelligence','personal ai','assistant'] },
  privacy:     { keywords: ['privacy','프라이버시','개인정보','private','secure','보안','trust','신뢰'] },
  local:       { keywords: ['local','로컬','local-first','offline','오프라인','on-device','self-hosted'] },
  memory:      { keywords: ['memory','기억','remember','recall','store','저장','retention','archive','vault'] },
  minimal:     { keywords: ['minimal','미니멀','clean','깔끔한','simple','quiet','조용한','calm'] },
  worldview:   { keywords: ['worldview','세계관','perspective','philosophy','철학','vision','비전'] },
  design:      { keywords: ['design','디자인','ui','ux','interface','layout','visual','시각'] },
  knowledge:   { keywords: ['knowledge','지식','insight','인사이트','learning','학습','concept','idea'] },
  data:        { keywords: ['data','데이터','information','정보','corpus','dataset','collection'] },
  depth:       { keywords: ['depth','layer','layered','dimension','차원','complex','복잡','structure'] },
  여행:        { keywords: ['여행','travel','trip','여행기','여행사'] },
  카페:        { keywords: ['카페','cafe','coffee','커피','커피숍'] },
  음식:        { keywords: ['음식','food','요리','cooking','먹방','맛집','레시피'] },
  패션:        { keywords: ['패션','fashion','스타일','style','코디','옷','의류'] },
  자연:        { keywords: ['자연','nature','풍경','landscape','숲','산','바다','sea','ocean'] },
};

function extractTextKeywords(text: string): Array<{ keyword: string; confidence: number }> {
  const lower = text.toLowerCase();
  const found: Array<{ keyword: string; confidence: number }> = [];
  for (const [group, { keywords }] of Object.entries(KEYWORD_GROUPS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { found.push({ keyword: group, confidence: 0.72 }); break; }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main extractor — API primary (Vision/Text), canvas/heuristic fallback
// ---------------------------------------------------------------------------

export async function extractSignals(item: RawItem, blob?: Blob): Promise<MultimodalSignal[]> {
  const signals: MultimodalSignal[] = [];
  const now = new Date().toISOString();

  const addSignal = (kind: MultimodalSignal['kind'], value: string, confidence: number) => {
    const v = (value ?? '').trim();
    if (!v || signals.some(s => s.kind === kind && s.value === v)) return;
    signals.push({ id: uuidv4(), itemId: item.id, kind, value: v, confidence, createdAt: now });
  };

  // Demo seed uses predefined signals (not API)
  if (item.entryPoint === 'demo_seed' && DEMO_SEED_SIGNALS[item.id]) {
    return DEMO_SEED_SIGNALS[item.id];
  }

  // ── Image/PDF: API primary → canvas fallback ──────────────────────────
  if ((item.assetType === 'image' || item.assetType === 'pdf') && blob) {
    const visionResult = await callVisionApi(blob, item.mimeType);

    if (visionResult) {
      console.log('[SnapMind] Vision API used for item', item.id, '— scene:', visionResult.scene, 'objects:', visionResult.objects?.slice(0,3));
      const apiSignals = visionResultToSignals(visionResult, item.id, now, signals);
      signals.push(...apiSignals);
    } else {
      console.log('[SnapMind] Vision API unavailable — canvas fallback for item', item.id);
      const local = await analyzeImageBlobLocally(blob);
      const localSignals = localImageToSignals(local, item.id, now);
      signals.push(...localSignals);
    }

    // Filename hints (additive, low confidence)
    if (item.fileName) {
      const lower = item.fileName.toLowerCase().replace(/[_\-\.]/g, ' ');
      for (const h of extractTextKeywords(lower)) {
        addSignal('keyword', h.keyword, h.confidence * 0.45);
      }
    }
  }

  // ── Text: API primary → heuristic fallback ────────────────────────────
  if (item.textContent) {
    addSignal('file_text', item.textContent.slice(0, 300), 0.9);

    const textResult = await callTextApi(item.textContent);
    if (textResult) {
      console.log('[SnapMind] Text API used for item', item.id, '— topics:', textResult.topics?.slice(0,3));
      const apiSignals = textResultToSignals(textResult, item.id, now, signals);
      signals.push(...apiSignals);
    } else {
      console.log('[SnapMind] Text API unavailable — heuristic fallback for item', item.id);
      for (const h of extractTextKeywords(item.textContent)) {
        addSignal('keyword', h.keyword, h.confidence);
      }
      const text = item.textContent.toLowerCase();
      if (text.includes('투명') || text.includes('반투명')) addSignal('aesthetic', 'translucent', 0.8);
      if (text.includes('로컬') || text.includes('local')) addSignal('intent', 'local-first', 0.85);
      if (text.includes('프라이버시') || text.includes('privacy')) addSignal('intent', 'privacy', 0.85);
    }
  }

  // ── Image without blob yet (queued only) ─────────────────────────────
  if (item.assetType === 'image' && !blob && item.fileName) {
    const lower = item.fileName.toLowerCase().replace(/[_\-\.]/g, ' ');
    addSignal('metadata', `filename:${item.fileName}`, 0.9);
    for (const h of extractTextKeywords(lower)) {
      addSignal('keyword', h.keyword, h.confidence * 0.7);
    }
    if (signals.length <= 1) {
      addSignal('aesthetic', 'visual-reference', 0.5);
      addSignal('keyword', 'image', 0.4);
    }
  }

  // ── User note always highest priority ─────────────────────────────────
  if (item.userNote) {
    addSignal('intent', item.userNote, 0.95);
    for (const h of extractTextKeywords(item.userNote)) {
      addSignal('keyword', h.keyword, h.confidence + 0.1);
    }
  }

  if (signals.length === 0) {
    addSignal('metadata', 'generic-item', 0.2);
  }

  return signals;
}
