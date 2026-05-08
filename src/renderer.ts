export type AnimationStyle =
  | 'punch'
  | 'cascade'
  | 'typewriter'
  | 'drift'
  | 'tiktok-bounce'
  | 'shorts-pop'
  | 'karaoke'
  | 'glitch'
  | 'lower-third'
  | 'word-zoom'
  | 'caption-stack'
  | 'neon-flicker'
  | 'minimal-fade'
  | 'stomp'
  | 'elastic-pop'
  | 'news-ticker'
  | 'clean-subtitle'
  | 'comic-pop'
  | 'luxury-title'
  | 'tech-hud';

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type HighlightShape = 'pill' | 'box' | 'underline' | 'none';
export type CaptionPosition = 'upper' | 'center' | 'lower' | 'safe-lower';
export type SafeAreaPreset = 'none' | 'tiktok' | 'reels' | 'shorts';

export type CaptionScene = {
  id: string;
  title: string;
  text: string;
  style: AnimationStyle;
  accent: string;
  duration: number;
};

export type FontControls = {
  family: string;
  weight: number;
  sizeScale: number;
  uppercase: boolean;
  letterSpacing: number;
  lineHeight: number;
  strokeWidth: number;
  shadowBlur: number;
  highlightShape: HighlightShape;
  maxWordsPerLine: number;
  position: CaptionPosition;
};

export type BrandKit = {
  colors: string[];
  fontFamily: string;
  watermark: string;
  watermarkEnabled: boolean;
};

export type RenderSettings = {
  scenes: CaptionScene[];
  width: number;
  height: number;
  duration: number;
  fps: number;
  font: FontControls;
  brand: BrandKit;
  foreground: string;
  safeArea: SafeAreaPreset;
};

type WordToken = {
  value: string;
  sourceIndex: number;
  start: number;
  end: number;
  line: number;
  x: number;
  y: number;
  width: number;
  emphasis: number;
  active: boolean;
};

type ActiveScene = {
  scene: CaptionScene;
  localTime: number;
  startTime: number;
  index: number;
};

export const DEFAULT_TEXT =
  'Your idea becomes kinetic text. Type a hook, preview the rhythm, then export it for your edit.';

export const PRESETS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '16:9': { width: 1920, height: 1080, label: '1920 x 1080' },
  '9:16': { width: 1080, height: 1920, label: '1080 x 1920' },
  '1:1': { width: 1080, height: 1080, label: '1080 x 1080' }
};

export const DEFAULT_FONT: FontControls = {
  family: 'Inter, Arial, sans-serif',
  weight: 900,
  sizeScale: 1,
  uppercase: true,
  letterSpacing: 0,
  lineHeight: 1.08,
  strokeWidth: 0.06,
  shadowBlur: 24,
  highlightShape: 'pill',
  maxWordsPerLine: 4,
  position: 'center'
};

export const DEFAULT_BRAND: BrandKit = {
  colors: ['#FF3B30', '#FFD60A', '#32D74B', '#64D2FF', '#BF5AF2', '#FF9F0A'],
  fontFamily: 'Inter, Arial, sans-serif',
  watermark: 'Kinetic Text',
  watermarkEnabled: false
};

export const STYLE_PRESETS: { id: AnimationStyle; label: string; description: string }[] = [
  { id: 'tiktok-bounce', label: 'TikTok Bounce', description: 'Centered captions with energetic bounce.' },
  { id: 'shorts-pop', label: 'Shorts Pop', description: 'Fast subtitle pop for short-form edits.' },
  { id: 'karaoke', label: 'Karaoke Highlight', description: 'Words stay visible while the active word lights up.' },
  { id: 'glitch', label: 'Glitch Reveal', description: 'Jittered reveal with RGB-style offset.' },
  { id: 'lower-third', label: 'Lower Third', description: 'Slide-in caption block near the bottom.' },
  { id: 'word-zoom', label: 'Word Zoom', description: 'Each word scales up into focus.' },
  { id: 'caption-stack', label: 'Caption Stack', description: 'Recent words stack into a readable block.' },
  { id: 'neon-flicker', label: 'Neon Flicker', description: 'Glow-heavy caption with flicker energy.' },
  { id: 'minimal-fade', label: 'Minimal Fade', description: 'Quiet fades for clean editorial captions.' },
  { id: 'stomp', label: 'Stomp', description: 'Heavy impact and quick settling motion.' },
  { id: 'elastic-pop', label: 'Elastic Pop', description: 'Springy oversized word entries.' },
  { id: 'news-ticker', label: 'News Ticker', description: 'Continuous lower-band horizontal motion.' },
  { id: 'clean-subtitle', label: 'Clean Subtitle', description: 'Readable subtitle block with subtle highlight.' },
  { id: 'comic-pop', label: 'Comic Pop', description: 'Playful tilted caption with strong outline.' },
  { id: 'luxury-title', label: 'Luxury Title', description: 'Elegant title treatment with restrained motion.' },
  { id: 'tech-hud', label: 'Tech HUD', description: 'Monospace panels and interface-like accents.' },
  { id: 'punch', label: 'Punch', description: 'Big captions with active-word impact.' },
  { id: 'cascade', label: 'Cascade', description: 'Words step into place line by line.' },
  { id: 'typewriter', label: 'Typewriter', description: 'Fast masked reveal for explainers.' },
  { id: 'drift', label: 'Drift', description: 'Smooth floating motion for calm edits.' }
];

export const SCENE_TEMPLATES: { id: string; label: string; scenes: Omit<CaptionScene, 'id'>[] }[] = [
  {
    id: 'viral-explainer',
    label: 'Hook - Problem - Solution - CTA',
    scenes: [
      { title: 'Hook', text: 'Stop scrolling.', style: 'tiktok-bounce', accent: '#FF3B30', duration: 2.2 },
      {
        title: 'Problem',
        text: 'Most captions fail because they move too slowly.',
        style: 'caption-stack',
        accent: '#FFD60A',
        duration: 5
      },
      {
        title: 'Solution',
        text: 'Use short beats and highlight one idea at a time.',
        style: 'karaoke',
        accent: '#64D2FF',
        duration: 5.5
      },
      { title: 'CTA', text: 'Export it with a transparent background.', style: 'word-zoom', accent: '#32D74B', duration: 3.5 }
    ]
  },
  {
    id: 'news-update',
    label: 'Breaking - Detail - Takeaway',
    scenes: [
      { title: 'Breaking', text: 'Breaking update', style: 'stomp', accent: '#FF3B30', duration: 2 },
      { title: 'Detail', text: 'Here is the detail your audience needs to know.', style: 'news-ticker', accent: '#FFD60A', duration: 6 },
      { title: 'Takeaway', text: 'The important part is what changes next.', style: 'clean-subtitle', accent: '#64D2FF', duration: 4 }
    ]
  },
  {
    id: 'product-demo',
    label: 'Title - Feature - Proof',
    scenes: [
      { title: 'Title', text: 'One workflow. Cleaner videos.', style: 'luxury-title', accent: '#F4F2EA', duration: 3 },
      { title: 'Feature', text: 'Build animated captions scene by scene.', style: 'tech-hud', accent: '#64D2FF', duration: 5 },
      { title: 'Proof', text: 'Preview in real time and export in HD.', style: 'shorts-pop', accent: '#32D74B', duration: 4 }
    ]
  }
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutBack = (t: number) => {
  const x = clamp(t, 0, 1) - 1;
  return 1 + 2.4 * x * x * x + 1.4 * x * x;
};
const easeInOut = (t: number) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export function getAspectSize(aspect: AspectRatio) {
  return PRESETS[aspect];
}

export function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function estimateDuration(text: string) {
  const words = normalizeText(text).split(' ').filter(Boolean).length;
  return clamp(Math.max(3.2, words * 0.34 + 1.2), 3, 180);
}

export function getTotalDuration(scenes: CaptionScene[]) {
  return scenes.reduce((total, scene) => total + Math.max(0.1, scene.duration), 0);
}

export function getFrameCount(settings: RenderSettings) {
  return Math.ceil(settings.duration * settings.fps);
}

export function createScene(partial: Partial<CaptionScene> = {}): CaptionScene {
  return {
    id: partial.id ?? crypto.randomUUID(),
    title: partial.title ?? 'Scene',
    text: partial.text ?? DEFAULT_TEXT,
    style: partial.style ?? 'tiktok-bounce',
    accent: partial.accent ?? '#FF3B30',
    duration: partial.duration ?? estimateDuration(partial.text ?? DEFAULT_TEXT)
  };
}

export function getActiveScene(settings: RenderSettings, time: number): ActiveScene {
  let cursor = 0;
  const fallback = settings.scenes[0] ?? createScene();
  const wrappedTime = settings.duration > 0 ? clamp(time, 0, Math.max(0, settings.duration - 1 / settings.fps)) : 0;

  for (let index = 0; index < settings.scenes.length; index += 1) {
    const scene = settings.scenes[index];
    const next = cursor + Math.max(0.1, scene.duration);
    if (wrappedTime < next || index === settings.scenes.length - 1) {
      return { scene, localTime: wrappedTime - cursor, startTime: cursor, index };
    }
    cursor = next;
  }

  return { scene: fallback, localTime: 0, startTime: 0, index: 0 };
}

function getSafeBounds(settings: RenderSettings) {
  const base = { left: 0.08, right: 0.08, top: 0.12, bottom: 0.12 };
  if (settings.safeArea === 'tiktok') {
    return { left: 0.08, right: 0.2, top: 0.11, bottom: 0.22 };
  }
  if (settings.safeArea === 'reels') {
    return { left: 0.08, right: 0.12, top: 0.12, bottom: 0.18 };
  }
  if (settings.safeArea === 'shorts') {
    return { left: 0.08, right: 0.16, top: 0.12, bottom: 0.2 };
  }
  return base;
}

function getBaseFontSize(settings: RenderSettings, scene: CaptionScene) {
  const shortestSide = Math.min(settings.width, settings.height);
  const words = normalizeText(scene.text).split(' ').length;
  const density = words > 18 ? 0.064 : words > 8 ? 0.074 : 0.088;
  return Math.round(clamp(shortestSide * density * settings.font.sizeScale, 34, 154));
}

function prepareContext(ctx: CanvasRenderingContext2D, settings: RenderSettings, scene: CaptionScene) {
  const fontSize = getBaseFontSize(settings, scene);
  const family = settings.font.family || settings.brand.fontFamily || DEFAULT_FONT.family;
  const fontFamily = scene.style === 'tech-hud' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : family;
  ctx.font = `${settings.font.weight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  return fontSize;
}

function measureText(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) {
  if (letterSpacing === 0) {
    return ctx.measureText(text).width;
  }
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number) {
  if (letterSpacing === 0) {
    ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function strokeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number) {
  if (letterSpacing === 0) {
    ctx.strokeText(text, x, y);
    return;
  }
  let cursor = x;
  for (const char of text) {
    ctx.strokeText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function getWordTiming(scene: CaptionScene, wordCount: number, sourceIndex: number) {
  const readableDuration = Math.max(0.6, scene.duration * 0.84);
  const step = readableDuration / Math.max(1, wordCount);
  const start = 0.16 + sourceIndex * step;
  return { start, end: start + Math.max(0.36, step * 1.9), step };
}

function getActiveWordIndex(scene: CaptionScene, wordCount: number, localTime: number) {
  const readableDuration = Math.max(0.6, scene.duration * 0.84);
  const step = readableDuration / Math.max(1, wordCount);
  return clamp(Math.floor((localTime - 0.16) / step), 0, Math.max(0, wordCount - 1));
}

function getVisibleWordRange(scene: CaptionScene, settings: RenderSettings, words: string[], activeIndex: number) {
  if (scene.style === 'news-ticker' || words.length <= settings.font.maxWordsPerLine * 2) {
    return { start: 0, end: words.length };
  }

  const max = Math.max(3, settings.font.maxWordsPerLine);
  if (scene.style === 'caption-stack') {
    const end = Math.min(words.length, activeIndex + 2);
    return { start: Math.max(0, end - max * 3), end };
  }

  if (scene.style === 'karaoke' || scene.style === 'clean-subtitle' || scene.style === 'lower-third') {
    const start = Math.max(0, activeIndex - max);
    return { start, end: Math.min(words.length, start + max * 3) };
  }

  const start = Math.max(0, activeIndex - Math.max(1, Math.floor(max / 2)));
  return { start, end: Math.min(words.length, start + max * 2) };
}

function getPositionY(settings: RenderSettings, scene: CaptionScene, lineCount: number, lineHeight: number) {
  const safe = getSafeBounds(settings);
  const contentHeight = Math.max(0, lineCount - 1) * lineHeight;
  const upper = settings.height * safe.top + contentHeight / 2 + lineHeight * 0.7;
  const lower = settings.height * (1 - safe.bottom) - contentHeight / 2 - lineHeight * 0.7;
  const center = settings.height * 0.5 - contentHeight / 2;

  if (scene.style === 'lower-third' || scene.style === 'news-ticker') {
    return lower - contentHeight / 2;
  }
  if (settings.font.position === 'upper') {
    return upper;
  }
  if (settings.font.position === 'lower' || settings.font.position === 'safe-lower') {
    return lower - contentHeight / 2;
  }
  return center;
}

function layoutWords(ctx: CanvasRenderingContext2D, settings: RenderSettings, scene: CaptionScene, localTime: number) {
  const source = normalizeText(scene.text) || DEFAULT_TEXT;
  const rawWords = source.split(' ').filter(Boolean);
  const words = settings.font.uppercase ? rawWords.map((word) => word.toUpperCase()) : rawWords;
  const activeIndex = getActiveWordIndex(scene, words.length, localTime);
  const { start, end } = getVisibleWordRange(scene, settings, words, activeIndex);
  const visibleWords = words.slice(start, end);
  const fontSize = prepareContext(ctx, settings, scene);
  const letterSpacing = settings.font.letterSpacing;
  const gap = fontSize * 0.26;
  const lineHeight = fontSize * settings.font.lineHeight;
  const safe = getSafeBounds(settings);
  const maxWidth =
    scene.style === 'lower-third' || scene.style === 'news-ticker'
      ? settings.width * (1 - safe.left - safe.right) * 0.84
      : settings.width * (1 - safe.left - safe.right);
  const lineWords: Omit<WordToken, 'line' | 'x' | 'y'>[][] = [];
  let current: Omit<WordToken, 'line' | 'x' | 'y'>[] = [];
  let currentWidth = 0;

  visibleWords.forEach((word, visibleIndex) => {
    const sourceIndex = start + visibleIndex;
    const timing = getWordTiming(scene, words.length, sourceIndex);
    const width = measureText(ctx, word, letterSpacing);
    const clean = word.replace(/[^\w'-]/g, '');
    const projected = currentWidth + (current.length > 0 ? gap : 0) + width;
    if (
      current.length > 0 &&
      (projected > maxWidth || current.length >= Math.max(1, settings.font.maxWordsPerLine))
    ) {
      lineWords.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push({
      value: word,
      sourceIndex,
      start: timing.start,
      end: timing.end,
      width,
      emphasis: clean.length > 7 || /[!?]$/.test(word) ? 1 : 0,
      active: sourceIndex === activeIndex
    });
    currentWidth += (current.length > 1 ? gap : 0) + width;
  });

  if (current.length > 0) {
    lineWords.push(current);
  }

  if (lineWords.length > 1) {
    const last = lineWords[lineWords.length - 1];
    const previous = lineWords[lineWords.length - 2];
    while (last.length < Math.max(2, Math.floor(settings.font.maxWordsPerLine / 2)) && previous.length > 2) {
      last.unshift(previous.pop() as Omit<WordToken, 'line' | 'x' | 'y'>);
    }
  }

  const startY = getPositionY(settings, scene, lineWords.length, lineHeight);
  return lineWords.flatMap((line, lineIndex) => {
    const lineWidth = line.reduce((sum, word, i) => sum + word.width + (i > 0 ? gap : 0), 0);
    let x =
      scene.style === 'lower-third' || scene.style === 'news-ticker'
        ? settings.width * safe.left
        : settings.width * 0.5 - lineWidth / 2;
    return line.map((word) => {
      const token = {
        ...word,
        line: lineIndex,
        x,
        y: startY + lineIndex * lineHeight
      };
      x += word.width + gap;
      return token;
    });
  });
}

function drawTransparentGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const size = Math.max(18, Math.round(Math.min(width, height) / 36));
  ctx.save();
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#202329' : '#171A20';
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGuides(ctx: CanvasRenderingContext2D, settings: RenderSettings) {
  if (settings.safeArea === 'none') {
    return;
  }

  const safe = getSafeBounds(settings);
  const x = settings.width * safe.left;
  const y = settings.height * safe.top;
  const width = settings.width * (1 - safe.left - safe.right);
  const height = settings.height * (1 - safe.top - safe.bottom);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 214, 10, 0.62)';
  ctx.lineWidth = Math.max(2, settings.width * 0.0018);
  ctx.setLineDash([settings.width * 0.012, settings.width * 0.01]);
  roundRect(ctx, x, y, width, height, 28);
  ctx.stroke();
  ctx.restore();
}

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  token: WordToken,
  settings: RenderSettings,
  scene: CaptionScene,
  fontSize: number,
  alpha: number
) {
  if (!token.active || settings.font.highlightShape === 'none') {
    return;
  }

  const padX = fontSize * 0.18;
  const height = fontSize * 1.08;
  ctx.save();
  ctx.globalAlpha = 0.92 * alpha;
  ctx.fillStyle = scene.accent;
  ctx.strokeStyle = scene.accent;
  ctx.lineWidth = Math.max(4, fontSize * 0.055);

  if (settings.font.highlightShape === 'underline') {
    ctx.beginPath();
    ctx.moveTo(-padX * 0.5, fontSize * 0.54);
    ctx.lineTo(token.width + padX * 0.5, fontSize * 0.54);
    ctx.stroke();
  } else {
    roundRect(
      ctx,
      -padX,
      -height * 0.5,
      token.width + padX * 2,
      height,
      settings.font.highlightShape === 'pill' ? height * 0.42 : fontSize * 0.08
    );
    ctx.fill();
  }
  ctx.restore();
}

function getStyleTransform(
  token: WordToken,
  scene: CaptionScene,
  settings: RenderSettings,
  localTime: number,
  fontSize: number
) {
  const intro = easeOutCubic((localTime - token.start) / 0.32);
  const activePulse = token.active ? Math.sin((localTime - token.start) * Math.PI * 4.2) : 0;
  const outro = 1 - easeInOut((localTime - (scene.duration - 0.42)) / 0.36);
  const base = {
    alpha: clamp(intro * outro, 0, 1),
    x: token.x,
    y: token.y,
    scale: 1,
    rotation: 0,
    skewX: 0
  };

  switch (scene.style) {
    case 'cascade':
      return { ...base, y: base.y + (1 - intro) * (fontSize * 0.9 + token.line * 18), rotation: (1 - intro) * -0.05 };
    case 'typewriter':
    case 'clean-subtitle':
      return { ...base, alpha: clamp((localTime - token.start) / 0.22, 0, 1) * outro };
    case 'drift':
      return {
        ...base,
        x: base.x + Math.sin(localTime * 1.4 + token.line) * 8 + (1 - intro) * -30,
        y: base.y + Math.cos(localTime * 1.1 + token.x * 0.01) * 5
      };
    case 'tiktok-bounce':
      return { ...base, y: base.y + (1 - intro) * 42, scale: 0.84 + easeOutBack((localTime - token.start) / 0.34) * 0.18 };
    case 'shorts-pop':
      return { ...base, y: base.y + (1 - intro) * 22, scale: 0.72 + intro * 0.28 + (token.active ? 0.08 : 0) };
    case 'karaoke':
      return { ...base, scale: token.active ? 1.04 : 1 };
    case 'glitch': {
      const jitter = intro < 1 ? Math.sin((localTime + token.sourceIndex) * 80) * fontSize * 0.05 : 0;
      return { ...base, x: base.x + jitter, y: base.y - jitter * 0.4, skewX: jitter * 0.004 };
    }
    case 'lower-third':
      return { ...base, x: base.x - (1 - intro) * settings.width * 0.08 };
    case 'word-zoom':
      return { ...base, scale: 0.45 + easeOutBack((localTime - token.start) / 0.34) * 0.58 };
    case 'caption-stack':
      return { ...base, y: base.y + (1 - intro) * 24, scale: token.active ? 1.08 : 0.96 };
    case 'neon-flicker': {
      const flicker = token.active ? 0.82 + Math.abs(Math.sin(localTime * 34 + token.sourceIndex)) * 0.18 : 1;
      return { ...base, alpha: base.alpha * flicker, scale: token.active ? 1.04 : 1 };
    }
    case 'minimal-fade':
      return { ...base, alpha: clamp((localTime - token.start) / 0.5, 0, 1) * outro };
    case 'stomp':
      return { ...base, y: base.y - (1 - intro) * 18, scale: 1.28 - intro * 0.28 + (token.active ? activePulse * 0.025 : 0) };
    case 'elastic-pop':
      return { ...base, scale: 0.4 + easeOutBack((localTime - token.start) / 0.42) * 0.66 };
    case 'news-ticker':
      return { ...base, x: base.x + settings.width * (1 - localTime / Math.max(scene.duration, 0.1)) - settings.width * 0.2 };
    case 'comic-pop':
      return { ...base, rotation: token.active ? -0.04 + activePulse * 0.025 : -0.025, scale: 0.78 + intro * 0.25 };
    case 'luxury-title':
      return { ...base, alpha: clamp((localTime - token.start) / 0.7, 0, 1) * outro, y: base.y + (1 - intro) * 12 };
    case 'tech-hud':
      return { ...base, x: base.x + (1 - intro) * -18, alpha: clamp((localTime - token.start) / 0.2, 0, 1) * outro };
    default:
      return { ...base, y: base.y + (1 - intro) * 24, scale: 0.96 + intro * 0.04 + (token.active ? activePulse * 0.035 : 0) };
  }
}

function drawTextEffects(
  ctx: CanvasRenderingContext2D,
  token: WordToken,
  settings: RenderSettings,
  scene: CaptionScene,
  localTime: number,
  fontSize: number
) {
  if (scene.style !== 'glitch' && scene.style !== 'tech-hud') {
    return;
  }

  const letterSpacing = settings.font.letterSpacing;
  ctx.save();
  if (scene.style === 'glitch') {
    ctx.globalAlpha = token.active ? 0.45 : 0.18;
    ctx.fillStyle = '#64D2FF';
    fillText(ctx, token.value, -fontSize * 0.05, -fontSize * 0.03, letterSpacing);
    ctx.fillStyle = '#FF3B30';
    fillText(ctx, token.value, fontSize * 0.05, fontSize * 0.03, letterSpacing);
  } else {
    ctx.globalAlpha = token.active ? 0.7 : 0.22;
    ctx.strokeStyle = scene.accent;
    ctx.lineWidth = Math.max(2, fontSize * 0.025);
    ctx.beginPath();
    ctx.moveTo(-fontSize * 0.18, -fontSize * 0.72);
    ctx.lineTo(token.width + fontSize * 0.18, -fontSize * 0.72);
    ctx.moveTo(-fontSize * 0.18, fontSize * 0.72);
    ctx.lineTo(token.width + fontSize * 0.18, fontSize * 0.72);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = scene.accent;
    ctx.fillRect(-fontSize * 0.2, fontSize * 0.68, token.width + fontSize * 0.4, Math.max(3, fontSize * 0.035));
  }
  ctx.restore();
}

function drawWord(
  ctx: CanvasRenderingContext2D,
  token: WordToken,
  settings: RenderSettings,
  scene: CaptionScene,
  localTime: number,
  fontSize: number
) {
  const transform = getStyleTransform(token, scene, settings, localTime, fontSize);
  if (transform.alpha <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = transform.alpha;
  ctx.translate(transform.x + token.width / 2, transform.y);
  ctx.rotate(transform.rotation);
  ctx.transform(1, 0, transform.skewX, 1, 0, 0);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-token.width / 2, 0);

  drawHighlight(ctx, token, settings, scene, fontSize, transform.alpha);
  drawTextEffects(ctx, token, settings, scene, localTime, fontSize);

  const letterSpacing = settings.font.letterSpacing;
  ctx.shadowColor =
    scene.style === 'neon-flicker' ? scene.accent : scene.style === 'luxury-title' ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.72)';
  ctx.shadowBlur = token.active ? settings.font.shadowBlur * 1.55 : settings.font.shadowBlur;
  ctx.shadowOffsetY = token.active ? 8 : 5;
  ctx.lineWidth = Math.max(0, fontSize * settings.font.strokeWidth);
  ctx.strokeStyle = scene.style === 'comic-pop' ? '#111111' : 'rgba(0, 0, 0, 0.52)';
  if (settings.font.strokeWidth > 0) {
    strokeText(ctx, token.value, 0, 0, letterSpacing);
  }

  if (scene.style === 'luxury-title') {
    ctx.fillStyle = token.active ? '#FFFFFF' : '#E7DCC2';
  } else if (scene.style === 'tech-hud') {
    ctx.fillStyle = token.active ? '#FFFFFF' : '#B9F3FF';
  } else {
    ctx.fillStyle = token.active && scene.style !== 'karaoke' ? '#FFFFFF' : settings.foreground;
  }

  if (scene.style === 'typewriter') {
    const reveal = clamp((localTime - token.start) / 0.24, 0, 1);
    ctx.beginPath();
    ctx.rect(-fontSize * 0.2, -fontSize * 0.75, token.width * reveal + fontSize * 0.2, fontSize * 1.5);
    ctx.clip();
  }

  fillText(ctx, token.value, 0, 0, letterSpacing);
  ctx.restore();
}

function drawSceneBackdrop(ctx: CanvasRenderingContext2D, settings: RenderSettings, scene: CaptionScene, localTime: number) {
  if (scene.style !== 'lower-third' && scene.style !== 'news-ticker' && scene.style !== 'tech-hud') {
    return;
  }

  const safe = getSafeBounds(settings);
  const y = scene.style === 'tech-hud' ? settings.height * 0.72 : settings.height * (1 - safe.bottom) - settings.height * 0.12;
  const h = settings.height * (scene.style === 'news-ticker' ? 0.1 : 0.14);
  const intro = easeOutCubic(localTime / 0.38);
  ctx.save();
  ctx.globalAlpha = intro * 0.86;
  ctx.fillStyle = scene.style === 'tech-hud' ? 'rgba(6, 18, 24, 0.84)' : 'rgba(0, 0, 0, 0.72)';
  roundRect(ctx, settings.width * safe.left * 0.75, y, settings.width * (1 - safe.left - safe.right * 0.8), h, 18);
  ctx.fill();
  ctx.globalAlpha = intro;
  ctx.fillStyle = scene.accent;
  ctx.fillRect(settings.width * safe.left * 0.75, y, Math.max(8, settings.width * 0.008), h);
  ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, settings: RenderSettings) {
  if (!settings.brand.watermarkEnabled || !settings.brand.watermark.trim()) {
    return;
  }

  const fontSize = Math.max(20, Math.min(settings.width, settings.height) * 0.025);
  ctx.save();
  ctx.font = `700 ${fontSize}px ${settings.brand.fontFamily || settings.font.family}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.fillText(settings.brand.watermark, settings.width * 0.96, settings.height * 0.95);
  ctx.restore();
}

export function renderFrame(
  canvas: HTMLCanvasElement,
  settings: RenderSettings,
  time: number,
  options: { preview?: boolean; guides?: boolean } = {}
) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    return;
  }

  if (canvas.width !== settings.width || canvas.height !== settings.height) {
    canvas.width = settings.width;
    canvas.height = settings.height;
  }

  ctx.clearRect(0, 0, settings.width, settings.height);

  if (options.preview) {
    drawTransparentGrid(ctx, settings.width, settings.height);
  }

  const { scene, localTime } = getActiveScene(settings, time);
  const fontSize = prepareContext(ctx, settings, scene);
  const words = layoutWords(ctx, settings, scene, Math.max(0, localTime - 0.04));

  drawSceneBackdrop(ctx, settings, scene, localTime);
  words.forEach((word) => drawWord(ctx, word, settings, scene, Math.max(0, localTime - 0.04), fontSize));
  drawWatermark(ctx, settings);

  if (options.preview && options.guides) {
    drawGuides(ctx, settings);
  }
}

export function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to create PNG frame.'));
      }
    }, 'image/png');
  });
}
