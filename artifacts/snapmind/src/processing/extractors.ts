import { v4 as uuidv4 } from 'uuid';
import type { RawItem, MultimodalSignal } from '../domain/types';
import { DEMO_SEED_SIGNALS } from '../demo/seedItems';

// ---------------------------------------------------------------------------
// Image Understanding — canvas-based local analysis (no API key needed)
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

async function analyzeImageBlob(blob: Blob): Promise<ImageUnderstanding> {
  const SIZE = 80;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(fallbackUnderstanding()); URL.revokeObjectURL(url); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        URL.revokeObjectURL(url);

        // Accumulate HSL values
        let totalH = 0, totalS = 0, totalL = 0;
        const hBuckets = new Array(12).fill(0); // 30° buckets
        let darkPixels = 0, lightPixels = 0, saturatedPixels = 0;
        const pixelCount = SIZE * SIZE;

        for (let i = 0; i < data.length; i += 4) {
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          totalH += h; totalS += s; totalL += l;
          hBuckets[Math.floor(h / 30) % 12]++;
          if (l < 0.3) darkPixels++;
          if (l > 0.7) lightPixels++;
          if (s > 0.5) saturatedPixels++;
        }

        const avgL = totalL / pixelCount;
        const avgS = totalS / pixelCount;
        const darkRatio = darkPixels / pixelCount;
        const lightRatio = lightPixels / pixelCount;
        const saturatedRatio = saturatedPixels / pixelCount;

        // Find dominant hue bucket
        const dominantBucket = hBuckets.indexOf(Math.max(...hBuckets));

        // Map hue bucket to color descriptor
        const hueDescriptors: string[] = [
          'red', 'orange-red', 'amber', 'yellow-green',
          'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'purple', 'magenta'
        ];
        const dominantHueName = hueDescriptors[dominantBucket];

        // Brightness category
        const brightness: 'dark' | 'medium' | 'light' =
          darkRatio > 0.5 ? 'dark' : lightRatio > 0.5 ? 'light' : 'medium';

        // Saturation category
        const saturation: 'muted' | 'balanced' | 'vibrant' =
          avgS < 0.2 ? 'muted' : avgS > 0.55 ? 'vibrant' : 'balanced';

        // Aesthetic signals from color characteristics
        const aesthetics: string[] = [];
        const keywords: string[] = [];
        const colors: string[] = [];

        // Blue / cyan / indigo range (buckets 7-9)
        if (dominantBucket >= 6 && dominantBucket <= 9) {
          colors.push('deep blue');
          if (saturation === 'vibrant') {
            aesthetics.push('holographic');
            aesthetics.push('neon-blue');
            keywords.push('hologram');
            keywords.push('neon');
          } else if (saturation === 'muted') {
            aesthetics.push('minimal-cool');
            keywords.push('minimal');
          } else {
            aesthetics.push('cool-tone');
            keywords.push('blue');
          }
        }
        // Purple / violet range (buckets 9-11)
        if (dominantBucket >= 9 && dominantBucket <= 11) {
          colors.push('purple');
          aesthetics.push('mystical');
          if (saturation === 'vibrant') {
            keywords.push('neon');
            aesthetics.push('holographic');
          } else {
            keywords.push('depth');
          }
        }
        // Cyan / teal range (buckets 5-7)
        if (dominantBucket >= 5 && dominantBucket <= 7) {
          colors.push('teal');
          aesthetics.push('futuristic');
          keywords.push('connection');
        }
        // Dark overall
        if (brightness === 'dark') {
          aesthetics.push('dark');
          keywords.push('depth');
          if (saturatedRatio > 0.2) {
            aesthetics.push('dramatic');
            keywords.push('contrast');
          }
        }
        // Light overall
        if (brightness === 'light') {
          aesthetics.push('bright');
          keywords.push('clarity');
        }
        // Vibrant overall
        if (saturation === 'vibrant') {
          aesthetics.push('high-contrast');
          keywords.push('energy');
        }
        // Muted overall
        if (saturation === 'muted') {
          aesthetics.push('subdued');
          keywords.push('quiet');
        }

        // Neutral fallback color
        if (colors.length === 0) colors.push(dominantHueName);

        // Detect possible visual patterns from pixel variance
        let variance = 0;
        const avgR = totalH / pixelCount;
        for (let i = 0; i < data.length; i += 4) {
          const diff = data[i] - avgR;
          variance += diff * diff;
        }
        variance = Math.sqrt(variance / pixelCount);
        const composition = variance > 60 ? 'complex/layered' : variance > 30 ? 'structured' : 'minimal';
        if (variance > 55) {
          keywords.push('complex');
          keywords.push('layered');
          aesthetics.push('network-like');
        } else if (variance < 25) {
          keywords.push('minimal');
          aesthetics.push('clean');
        }

        // Build caption from detected characteristics
        const moodMap: Record<string, string> = {
          'dark-vibrant': '어둡고 강렬한',
          'dark-muted': '어둡고 차분한',
          'dark-balanced': '차갑고 깊은',
          'medium-vibrant': '선명하고 생동감 있는',
          'medium-muted': '차분하고 절제된',
          'medium-balanced': '균형 잡힌',
          'light-vibrant': '밝고 강렬한',
          'light-muted': '밝고 미니멀한',
          'light-balanced': '맑고 정돈된',
        };
        const mood = moodMap[`${brightness}-${saturation}`] ?? '인상적인';

        const colorLabel = colors[0] ?? dominantHueName;
        const aestheticLabel = aesthetics[0] ?? '독특한';
        const caption = `${mood} ${colorLabel} 톤의 이미지. ${aestheticLabel} 느낌의 시각적 구성.`;
        const inferredUserInterest = `${aestheticLabel} 계열의 시각 언어에 반복적으로 끌리는 경향`;

        resolve({
          caption,
          visibleText: '',
          objects: [],
          aesthetics: [...new Set(aesthetics)],
          mood,
          colors: [...new Set(colors)],
          composition,
          keywords: [...new Set(keywords)],
          inferredUserInterest,
        });
      } catch {
        URL.revokeObjectURL(url);
        resolve(fallbackUnderstanding());
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(fallbackUnderstanding()); };
    img.src = url;
  });
}

function fallbackUnderstanding(): ImageUnderstanding {
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

// ---------------------------------------------------------------------------
// Text keyword extraction — rich vocabulary
// ---------------------------------------------------------------------------

const KEYWORD_GROUPS: Record<string, { keywords: string[]; nodeHint: string }> = {
  hologram:    { keywords: ['hologram', 'holographic', '홀로그램', 'transparent', 'translucent', 'neon', '네온', 'glow', 'glowing'], nodeHint: 'aesthetic' },
  constellation: { keywords: ['constellation', '별자리', 'star', 'stars', 'cosmos', '우주', 'space', 'galaxy', '은하'], nodeHint: 'aesthetic' },
  network:     { keywords: ['network', 'graph', 'connection', 'connected', 'link', '연결', 'node', 'edge', 'web', '그래프'], nodeHint: 'interest' },
  brain:       { keywords: ['brain', '뇌', 'neuron', '뉴런', 'neural', 'cognitive', 'mind', '마음', 'intelligence', '지능'], nodeHint: 'interest' },
  agent:       { keywords: ['agent', '에이전트', 'ai', 'artificial intelligence', 'personal ai', '개인 ai', 'assistant'], nodeHint: 'project' },
  privacy:     { keywords: ['privacy', '프라이버시', '개인정보', 'private', 'secure', '보안', 'trust', '신뢰', 'consent'], nodeHint: 'project' },
  local:       { keywords: ['local', '로컬', 'local-first', 'offline', '오프라인', 'on-device', 'self-hosted'], nodeHint: 'project' },
  memory:      { keywords: ['memory', '기억', 'remember', 'recall', 'store', '저장', 'retention', 'archive', 'vault'], nodeHint: 'interest' },
  minimal:     { keywords: ['minimal', '미니멀', 'clean', '깔끔한', 'simple', 'quiet', '조용한', 'calm', '고요한'], nodeHint: 'aesthetic' },
  worldview:   { keywords: ['worldview', '세계관', 'perspective', 'philosophy', '철학', 'ideology', 'vision', '비전'], nodeHint: 'idea' },
  design:      { keywords: ['design', '디자인', 'ui', 'ux', 'interface', 'layout', 'visual', '시각', 'aesthetic', '미적'], nodeHint: 'aesthetic' },
  knowledge:   { keywords: ['knowledge', '지식', 'insight', '인사이트', 'learning', '학습', 'concept', 'idea', '아이디어'], nodeHint: 'idea' },
  data:        { keywords: ['data', '데이터', 'information', '정보', 'corpus', 'dataset', 'collection'], nodeHint: 'evidence' },
  depth:       { keywords: ['depth', 'layer', 'layered', 'dimension', '차원', 'complex', '복잡', 'structure', '구조'], nodeHint: 'aesthetic' },
};

function extractTextKeywords(text: string): Array<{ keyword: string; group: string; confidence: number }> {
  const lower = text.toLowerCase();
  const found: Array<{ keyword: string; group: string; confidence: number }> = [];
  for (const [group, { keywords }] of Object.entries(KEYWORD_GROUPS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        found.push({ keyword: group, group, confidence: 0.75 });
        break;
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main extractor — now async to support image analysis
// ---------------------------------------------------------------------------

export async function extractSignals(item: RawItem, blob?: Blob): Promise<MultimodalSignal[]> {
  const signals: MultimodalSignal[] = [];
  const now = new Date().toISOString();

  const addSignal = (kind: MultimodalSignal['kind'], value: string, confidence: number) => {
    if (value.trim() && !signals.some(s => s.kind === kind && s.value === value)) {
      signals.push({ id: uuidv4(), itemId: item.id, kind, value: value.trim(), confidence, createdAt: now });
    }
  };

  // Demo seed: use predefined signals
  if (item.entryPoint === 'demo_seed' && DEMO_SEED_SIGNALS[item.id]) {
    return DEMO_SEED_SIGNALS[item.id];
  }

  // ── Image processing ─────────────────────────────────────────────────
  if ((item.assetType === 'image' || item.assetType === 'pdf') && blob) {
    const understanding = await analyzeImageBlob(blob);

    // Caption as a visual_caption signal
    addSignal('visual_caption', understanding.caption, 0.85);

    // Each aesthetic becomes a signal
    for (const aes of understanding.aesthetics) {
      addSignal('aesthetic', aes, 0.8);
    }
    // Each keyword
    for (const kw of understanding.keywords) {
      addSignal('keyword', kw, 0.72);
    }
    // Colors as aesthetic signals
    for (const col of understanding.colors) {
      if (col !== 'unknown') addSignal('aesthetic', col, 0.65);
    }
    // Mood as intent
    addSignal('intent', understanding.inferredUserInterest, 0.7);
    // Composition
    if (understanding.composition && understanding.composition !== 'unknown') {
      addSignal('metadata', `composition:${understanding.composition}`, 0.6);
    }

    // Also check filename for any extra hints
    if (item.fileName) {
      const lower = item.fileName.toLowerCase().replace(/[_\-\.]/g, ' ');
      const hits = extractTextKeywords(lower);
      for (const h of hits) {
        addSignal('keyword', h.keyword, h.confidence * 0.6);
      }
    }
  }

  // ── Text processing ───────────────────────────────────────────────────
  if (item.textContent) {
    addSignal('file_text', item.textContent.slice(0, 300), 0.9);
    const hits = extractTextKeywords(item.textContent);
    for (const h of hits) {
      addSignal('keyword', h.keyword, h.confidence);
    }
    // Detect explicit aesthetic language in text
    const text = item.textContent.toLowerCase();
    if (text.includes('투명') || text.includes('반투명')) addSignal('aesthetic', 'translucent', 0.8);
    if (text.includes('로컬') || text.includes('local')) addSignal('intent', 'local-first', 0.85);
    if (text.includes('프라이버시') || text.includes('privacy')) addSignal('intent', 'privacy', 0.85);
  }

  // ── File-only (no blob yet available) ────────────────────────────────
  if ((item.assetType === 'image') && !blob && item.fileName) {
    const lower = item.fileName.toLowerCase().replace(/[_\-\.]/g, ' ');
    addSignal('metadata', `filename:${item.fileName}`, 0.9);
    const hits = extractTextKeywords(lower);
    for (const h of hits) {
      addSignal('keyword', h.keyword, h.confidence * 0.7);
    }
    // Always produce at least a generic visual signal
    if (signals.length <= 1) {
      addSignal('aesthetic', 'visual-reference', 0.5);
      addSignal('keyword', 'image', 0.4);
    }
  }

  // ── User note always takes priority ──────────────────────────────────
  if (item.userNote) {
    addSignal('intent', item.userNote, 0.95);
    const noteHits = extractTextKeywords(item.userNote);
    for (const h of noteHits) {
      addSignal('keyword', h.keyword, h.confidence + 0.1);
    }
  }

  // Final fallback
  if (signals.length === 0) {
    addSignal('metadata', 'generic-item', 0.2);
  }

  return signals;
}
