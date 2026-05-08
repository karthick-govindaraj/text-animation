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

export type TypographyStyle =
  | 'motion'
  | 'animated'
  | 'fluid'
  | 'three-d'
  | 'particle'
  | 'glitch-typography'
  | 'mask-reveal'
  | 'handwritten'
  | 'bounce-typography'
  | 'cinematic'
  | 'minimal'
  | 'sync'
  | 'morph'
  | 'neon'
  | 'liquid'
  | 'retro'
  | 'ui-tech'
  | 'explosive'
  | 'scroll-based'
  | 'ai-cyberpunk';

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type HighlightShape = 'pill' | 'box' | 'underline' | 'none';
export type CaptionPosition = 'upper' | 'center' | 'lower' | 'safe-lower';
export type SafeAreaPreset = 'none' | 'tiktok' | 'reels' | 'shorts';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type CaptionScene = {
  id: string;
  title: string;
  text: string;
  animationStyle: AnimationStyle;
  typographyStyle: TypographyStyle;
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
  textAlign: TextAlign;
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
  justifyGap: number;
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
  family: 'Bebas Neue, Impact, sans-serif',
  weight: 900,
  sizeScale: 1,
  uppercase: true,
  letterSpacing: 0,
  lineHeight: 1.08,
  strokeWidth: 0.06,
  shadowBlur: 24,
  highlightShape: 'pill',
  maxWordsPerLine: 4,
  position: 'center',
  textAlign: 'center'
};

export const DEFAULT_BRAND: BrandKit = {
  colors: ['#FF3B30', '#FFD60A', '#32D74B', '#64D2FF', '#BF5AF2', '#FF9F0A'],
  fontFamily: 'Inter, Arial, sans-serif',
  watermark: 'Kinetic Text',
  watermarkEnabled: false
};

export const FONT_FAMILIES: { label: string; family: string; weight: number }[] = [
  { label: 'Bebas Neue', family: 'Bebas Neue, Impact, sans-serif', weight: 400 },
  { label: 'Anton', family: 'Anton, Impact, sans-serif', weight: 400 },
  { label: 'Montserrat', family: 'Montserrat, Arial, sans-serif', weight: 800 },
  { label: 'Poppins', family: 'Poppins, Arial, sans-serif', weight: 800 },
  { label: 'Oswald', family: 'Oswald, Arial Narrow, sans-serif', weight: 700 },
  { label: 'League Spartan', family: 'League Spartan, Arial, sans-serif', weight: 800 },
  { label: 'Orbitron', family: 'Orbitron, ui-monospace, monospace', weight: 800 },
  { label: 'Exo 2', family: 'Exo 2, Arial, sans-serif', weight: 800 },
  { label: 'Cinzel', family: 'Cinzel, Georgia, serif', weight: 700 },
  { label: 'Barlow Condensed', family: 'Barlow Condensed, Arial Narrow, sans-serif', weight: 800 },
  { label: 'Teko', family: 'Teko, Arial Narrow, sans-serif', weight: 700 },
  { label: 'Rajdhani', family: 'Rajdhani, Arial, sans-serif', weight: 700 },
  { label: 'Audiowide', family: 'Audiowide, ui-monospace, monospace', weight: 400 },
  { label: 'Archivo Black', family: 'Archivo Black, Arial Black, sans-serif', weight: 400 },
  { label: 'Russo One', family: 'Russo One, Arial Black, sans-serif', weight: 400 }
];

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

export const TYPOGRAPHY_PRESETS: { id: TypographyStyle; label: string; description: string }[] = [
  { id: 'motion', label: 'Motion Typography', description: 'Directional streaks and dynamic movement accents.' },
  { id: 'animated', label: 'Animated Typography', description: 'Fade, zoom, rotate, and slide visual treatment.' },
  { id: 'fluid', label: 'Fluid Typography', description: 'Wave distortion and elastic flow.' },
  { id: 'three-d', label: '3D Typography', description: 'Layered shadow depth and perspective skew.' },
  { id: 'particle', label: 'Particle Typography', description: 'Dotted text fill and particle sparkle simulation.' },
  { id: 'glitch-typography', label: 'Glitch Typography', description: 'RGB split, jitter, and digital noise.' },
  { id: 'mask-reveal', label: 'Mask Reveal Typography', description: 'Wipe and clipping reveal treatment.' },
  { id: 'handwritten', label: 'Handwritten Typography', description: 'Progressive draw-style reveal.' },
  { id: 'bounce-typography', label: 'Bounce Typography', description: 'Rounded elastic visual treatment.' },
  { id: 'cinematic', label: 'Cinematic Typography', description: 'Dramatic scale, depth, and strong shadow.' },
  { id: 'minimal', label: 'Minimal Typography', description: 'Clean flat type with subtle opacity.' },
  { id: 'sync', label: 'Sync Typography', description: 'Time-based beat pulse emphasis.' },
  { id: 'morph', label: 'Morph Typography', description: 'Crossfade and scale morph approximation.' },
  { id: 'neon', label: 'Neon Typography', description: 'Glow and flicker treatment.' },
  { id: 'liquid', label: 'Liquid Typography', description: 'Drip and water-like offsets.' },
  { id: 'retro', label: 'Retro Typography', description: 'Arcade colors and scanline accents.' },
  { id: 'ui-tech', label: 'UI / Tech Typography', description: 'HUD brackets and futuristic interface accents.' },
  { id: 'explosive', label: 'Explosive Typography', description: 'Burst lines, sparks, and impact styling.' },
  { id: 'scroll-based', label: 'Scroll-Based Typography', description: 'Scroll-style visual flow inside the video.' },
  { id: 'ai-cyberpunk', label: 'AI / Cyberpunk Typography', description: 'Holographic magenta/cyan cyber styling.' }
];

export const SCENE_TEMPLATES: { id: string; label: string; scenes: Omit<CaptionScene, 'id'>[] }[] = [
  {
    id: 'viral-explainer',
    label: 'Hook - Problem - Solution - CTA',
    scenes: [
      {
        title: 'Hook',
        text: 'Stop scrolling.',
        animationStyle: 'tiktok-bounce',
        typographyStyle: 'cinematic',
        accent: '#FF3B30',
        duration: 2.2
      },
      {
        title: 'Problem',
        text: 'Most captions fail because they move too slowly.',
        animationStyle: 'caption-stack',
        typographyStyle: 'motion',
        accent: '#FFD60A',
        duration: 5
      },
      {
        title: 'Solution',
        text: 'Use short beats and highlight one idea at a time.',
        animationStyle: 'karaoke',
        typographyStyle: 'sync',
        accent: '#64D2FF',
        duration: 5.5
      },
      {
        title: 'CTA',
        text: 'Export it with a transparent background.',
        animationStyle: 'word-zoom',
        typographyStyle: 'neon',
        accent: '#32D74B',
        duration: 3.5
      }
    ]
  },
  {
    id: 'news-update',
    label: 'Breaking - Detail - Takeaway',
    scenes: [
      {
        title: 'Breaking',
        text: 'Breaking update',
        animationStyle: 'stomp',
        typographyStyle: 'explosive',
        accent: '#FF3B30',
        duration: 2
      },
      {
        title: 'Detail',
        text: 'Here is the detail your audience needs to know.',
        animationStyle: 'news-ticker',
        typographyStyle: 'retro',
        accent: '#FFD60A',
        duration: 6
      },
      {
        title: 'Takeaway',
        text: 'The important part is what changes next.',
        animationStyle: 'clean-subtitle',
        typographyStyle: 'minimal',
        accent: '#64D2FF',
        duration: 4
      }
    ]
  },
  {
    id: 'product-demo',
    label: 'Title - Feature - Proof',
    scenes: [
      {
        title: 'Title',
        text: 'One workflow. Cleaner videos.',
        animationStyle: 'luxury-title',
        typographyStyle: 'three-d',
        accent: '#F4F2EA',
        duration: 3
      },
      {
        title: 'Feature',
        text: 'Build animated captions scene by scene.',
        animationStyle: 'tech-hud',
        typographyStyle: 'ui-tech',
        accent: '#64D2FF',
        duration: 5
      },
      {
        title: 'Proof',
        text: 'Preview in real time and export in HD.',
        animationStyle: 'shorts-pop',
        typographyStyle: 'ai-cyberpunk',
        accent: '#32D74B',
        duration: 4
      }
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
    animationStyle: partial.animationStyle ?? 'tiktok-bounce',
    typographyStyle: partial.typographyStyle ?? 'cinematic',
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
  const fontFamily =
    scene.animationStyle === 'tech-hud' || scene.typographyStyle === 'ui-tech'
      ? 'Orbitron, Rajdhani, ui-monospace, SFMono-Regular, Menlo, monospace'
      : family;
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
  if (scene.animationStyle === 'news-ticker' || scene.typographyStyle === 'scroll-based' || words.length <= settings.font.maxWordsPerLine * 2) {
    return { start: 0, end: words.length };
  }

  const max = Math.max(3, settings.font.maxWordsPerLine);
  if (scene.animationStyle === 'caption-stack') {
    const end = Math.min(words.length, activeIndex + 2);
    return { start: Math.max(0, end - max * 3), end };
  }

  if (scene.animationStyle === 'karaoke' || scene.animationStyle === 'clean-subtitle' || scene.animationStyle === 'lower-third') {
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

  if (scene.animationStyle === 'lower-third' || scene.animationStyle === 'news-ticker') {
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
    scene.animationStyle === 'lower-third' || scene.animationStyle === 'news-ticker'
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
      active: sourceIndex === activeIndex,
      justifyGap: 0
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
    const availableWidth = settings.width * (1 - safe.left - safe.right);
    const leftX = settings.width * safe.left;
    const rightX = settings.width * (1 - safe.right);
    const shouldJustify = settings.font.textAlign === 'justify' && lineIndex < lineWords.length - 1 && line.length > 1;
    const extraGap = shouldJustify ? Math.max(0, (availableWidth - lineWidth) / (line.length - 1)) : 0;
    let x = leftX;
    if (settings.font.textAlign === 'center' || settings.font.textAlign === 'justify') {
      x = shouldJustify ? leftX : settings.width * 0.5 - lineWidth / 2;
    } else if (settings.font.textAlign === 'right') {
      x = rightX - lineWidth;
    }
    return line.map((word) => {
      const token = {
        ...word,
        justifyGap: extraGap,
        line: lineIndex,
        x,
        y: startY + lineIndex * lineHeight
      };
      x += word.width + gap + extraGap;
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

  switch (scene.animationStyle) {
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
  if (
    scene.typographyStyle !== 'glitch-typography' &&
    scene.typographyStyle !== 'ui-tech' &&
    scene.typographyStyle !== 'particle' &&
    scene.typographyStyle !== 'retro' &&
    scene.typographyStyle !== 'explosive' &&
    scene.typographyStyle !== 'ai-cyberpunk' &&
    scene.typographyStyle !== 'motion' &&
    scene.typographyStyle !== 'fluid' &&
    scene.typographyStyle !== 'liquid' &&
    scene.typographyStyle !== 'cinematic' &&
    scene.typographyStyle !== 'neon' &&
    scene.typographyStyle !== 'scroll-based'
  ) {
    return;
  }

  const letterSpacing = settings.font.letterSpacing;
  ctx.save();
  if (scene.typographyStyle === 'glitch-typography' || scene.typographyStyle === 'ai-cyberpunk') {
    ctx.globalAlpha = token.active ? 0.45 : 0.18;
    ctx.fillStyle = scene.typographyStyle === 'ai-cyberpunk' ? '#00F5FF' : '#64D2FF';
    fillText(ctx, token.value, -fontSize * 0.05, -fontSize * 0.03, letterSpacing);
    ctx.fillStyle = scene.typographyStyle === 'ai-cyberpunk' ? '#FF2BD6' : '#FF3B30';
    fillText(ctx, token.value, fontSize * 0.05, fontSize * 0.03, letterSpacing);
  } else if (scene.typographyStyle === 'ui-tech') {
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
  } else if (scene.typographyStyle === 'particle') {
    ctx.globalAlpha = token.active ? 0.72 : 0.34;
    ctx.fillStyle = scene.accent;
    const dot = Math.max(2, fontSize * 0.035);
    for (let x = 0; x < token.width; x += dot * 3.1) {
      const y = Math.sin((x + localTime * 80 + token.sourceIndex * 13) * 0.05) * fontSize * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scene.typographyStyle === 'retro') {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#FFD60A';
    ctx.lineWidth = Math.max(2, fontSize * 0.02);
    for (let y = -fontSize * 0.55; y < fontSize * 0.6; y += fontSize * 0.16) {
      ctx.beginPath();
      ctx.moveTo(-fontSize * 0.18, y);
      ctx.lineTo(token.width + fontSize * 0.18, y);
      ctx.stroke();
    }
  } else if (scene.typographyStyle === 'explosive') {
    ctx.globalAlpha = token.active ? 0.75 : 0.22;
    ctx.strokeStyle = '#FF7A00';
    ctx.lineWidth = Math.max(3, fontSize * 0.03);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + localTime * 0.5;
      const start = fontSize * 0.45;
      const end = fontSize * (0.75 + (i % 3) * 0.18);
      ctx.beginPath();
      ctx.moveTo(token.width / 2 + Math.cos(angle) * start, Math.sin(angle) * start);
      ctx.lineTo(token.width / 2 + Math.cos(angle) * end, Math.sin(angle) * end);
      ctx.stroke();
    }
  } else if (scene.typographyStyle === 'motion') {
    ctx.globalAlpha = token.active ? 0.55 : 0.22;
    ctx.strokeStyle = scene.accent;
    ctx.lineWidth = Math.max(3, fontSize * 0.035);
    for (let i = 0; i < 4; i += 1) {
      const y = -fontSize * 0.34 + i * fontSize * 0.22;
      ctx.beginPath();
      ctx.moveTo(-fontSize * (0.9 + i * 0.18), y);
      ctx.lineTo(-fontSize * 0.18, y);
      ctx.stroke();
    }
  } else if (scene.typographyStyle === 'fluid' || scene.typographyStyle === 'liquid') {
    ctx.globalAlpha = token.active ? 0.52 : 0.2;
    ctx.fillStyle = scene.typographyStyle === 'liquid' ? '#45D9FF' : scene.accent;
    for (let i = 0; i < 5; i += 1) {
      const x = (token.width / 5) * i + Math.sin(localTime * 3 + i) * fontSize * 0.05;
      const h = fontSize * (0.18 + (i % 3) * 0.09);
      roundRect(ctx, x, fontSize * 0.42, fontSize * 0.07, h, fontSize * 0.04);
      ctx.fill();
    }
  } else if (scene.typographyStyle === 'cinematic') {
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = scene.accent;
    ctx.fillRect(-fontSize * 0.18, -fontSize * 0.78, token.width + fontSize * 0.36, Math.max(4, fontSize * 0.035));
    ctx.fillRect(-fontSize * 0.18, fontSize * 0.74, token.width + fontSize * 0.36, Math.max(4, fontSize * 0.035));
  } else if (scene.typographyStyle === 'neon') {
    ctx.globalAlpha = token.active ? 0.6 : 0.3;
    ctx.strokeStyle = scene.accent;
    ctx.lineWidth = Math.max(2, fontSize * 0.025);
    strokeText(ctx, token.value, 0, 0, letterSpacing);
  } else if (scene.typographyStyle === 'scroll-based') {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = scene.accent;
    ctx.lineWidth = Math.max(2, fontSize * 0.025);
    ctx.beginPath();
    ctx.moveTo(token.width + fontSize * 0.25, -fontSize * 0.42);
    ctx.lineTo(token.width + fontSize * 0.48, -fontSize * 0.18);
    ctx.lineTo(token.width + fontSize * 0.25, fontSize * 0.06);
    ctx.moveTo(token.width + fontSize * 0.25, fontSize * 0.16);
    ctx.lineTo(token.width + fontSize * 0.48, fontSize * 0.4);
    ctx.lineTo(token.width + fontSize * 0.25, fontSize * 0.64);
    ctx.stroke();
  }
  ctx.restore();
}

function applyTypographyTransform(
  transform: ReturnType<typeof getStyleTransform>,
  token: WordToken,
  scene: CaptionScene,
  localTime: number,
  fontSize: number
) {
  const intro = easeOutCubic((localTime - token.start) / 0.36);
  const pulse = token.active ? Math.sin(localTime * Math.PI * 3.5 + token.sourceIndex) : 0;

  switch (scene.typographyStyle) {
    case 'motion':
      return { ...transform, x: transform.x + (1 - intro) * -fontSize * 0.55 };
    case 'animated':
      return { ...transform, rotation: transform.rotation + (1 - intro) * -0.12, scale: transform.scale * (0.82 + intro * 0.18) };
    case 'fluid':
      return { ...transform, y: transform.y + Math.sin(localTime * 3 + token.sourceIndex) * fontSize * 0.08 };
    case 'three-d':
      return { ...transform, skewX: transform.skewX - 0.12, y: transform.y - token.line * fontSize * 0.02 };
    case 'particle':
      return { ...transform, alpha: transform.alpha * (token.active ? 0.92 : 0.72) };
    case 'glitch-typography': {
      const jitter = Math.sin((localTime + token.sourceIndex) * 90) * fontSize * 0.025;
      return { ...transform, x: transform.x + jitter, skewX: transform.skewX + jitter * 0.006 };
    }
    case 'mask-reveal':
      return { ...transform, x: transform.x + (1 - intro) * fontSize * 0.25 };
    case 'handwritten':
      return { ...transform, alpha: clamp((localTime - token.start) / 0.65, 0, 1) };
    case 'bounce-typography':
      return { ...transform, scale: transform.scale * (0.9 + easeOutBack((localTime - token.start) / 0.42) * 0.12) };
    case 'cinematic':
      return { ...transform, scale: transform.scale * (1.04 + (token.active ? 0.04 : 0)), y: transform.y - (1 - intro) * fontSize * 0.2 };
    case 'minimal':
      return { ...transform, alpha: transform.alpha * 0.9 };
    case 'sync':
      return { ...transform, scale: transform.scale * (1 + Math.max(0, pulse) * 0.055) };
    case 'morph':
      return { ...transform, scale: transform.scale * (0.82 + intro * 0.18), alpha: transform.alpha * (0.75 + intro * 0.25) };
    case 'neon':
      return { ...transform, alpha: transform.alpha * (0.86 + Math.abs(Math.sin(localTime * 16 + token.sourceIndex)) * 0.14) };
    case 'liquid':
      return { ...transform, y: transform.y + Math.sin(localTime * 4 + token.sourceIndex * 0.9) * fontSize * 0.1 };
    case 'retro':
      return { ...transform, skewX: transform.skewX - 0.08 };
    case 'ui-tech':
      return { ...transform, x: transform.x + (1 - intro) * -fontSize * 0.18 };
    case 'explosive':
      return { ...transform, scale: transform.scale * (1.22 - intro * 0.22), rotation: transform.rotation + (1 - intro) * 0.08 };
    case 'scroll-based':
      return { ...transform, y: transform.y - localTime * fontSize * 0.22 };
    case 'ai-cyberpunk':
      return { ...transform, skewX: transform.skewX - 0.08, alpha: transform.alpha * (0.88 + Math.abs(Math.sin(localTime * 20)) * 0.12) };
    default:
      return transform;
  }
}

function drawWord(
  ctx: CanvasRenderingContext2D,
  token: WordToken,
  settings: RenderSettings,
  scene: CaptionScene,
  localTime: number,
  fontSize: number
) {
  const transform = applyTypographyTransform(getStyleTransform(token, scene, settings, localTime, fontSize), token, scene, localTime, fontSize);
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
  const isNeon = scene.typographyStyle === 'neon' || scene.animationStyle === 'neon-flicker';
  ctx.shadowColor =
    isNeon || scene.typographyStyle === 'ai-cyberpunk'
      ? scene.accent
      : scene.typographyStyle === 'cinematic' || scene.animationStyle === 'luxury-title'
        ? 'rgba(255,255,255,0.38)'
        : 'rgba(0,0,0,0.72)';
  ctx.shadowBlur = token.active || isNeon ? settings.font.shadowBlur * 1.55 : settings.font.shadowBlur;
  ctx.shadowOffsetY = token.active ? 8 : 5;
  ctx.lineWidth = Math.max(0, fontSize * settings.font.strokeWidth);
  ctx.strokeStyle =
    scene.animationStyle === 'comic-pop' || scene.typographyStyle === 'bounce-typography'
      ? '#111111'
      : scene.typographyStyle === 'three-d'
        ? 'rgba(255,255,255,0.25)'
        : 'rgba(0, 0, 0, 0.52)';
  if (settings.font.strokeWidth > 0) {
    if (scene.typographyStyle === 'three-d' || scene.typographyStyle === 'cinematic') {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      for (let i = 7; i >= 1; i -= 1) {
        fillText(ctx, token.value, i * fontSize * 0.035, i * fontSize * 0.035, letterSpacing);
      }
      ctx.restore();
    }
    strokeText(ctx, token.value, 0, 0, letterSpacing);
  }

  if (scene.typographyStyle === 'liquid') {
    ctx.fillStyle = token.active ? '#B8F3FF' : '#42D9FF';
  } else if (scene.typographyStyle === 'retro') {
    ctx.fillStyle = token.active ? '#FFD60A' : '#FF7A00';
  } else if (scene.typographyStyle === 'ui-tech' || scene.animationStyle === 'tech-hud') {
    ctx.fillStyle = token.active ? '#FFFFFF' : '#B9F3FF';
  } else if (scene.typographyStyle === 'cinematic' || scene.animationStyle === 'luxury-title') {
    ctx.fillStyle = token.active ? '#FFFFFF' : '#E7DCC2';
  } else if (scene.typographyStyle === 'minimal') {
    ctx.fillStyle = token.active ? '#FFFFFF' : 'rgba(244, 242, 234, 0.82)';
  } else {
    ctx.fillStyle = token.active && scene.animationStyle !== 'karaoke' ? '#FFFFFF' : settings.foreground;
  }

  if (scene.animationStyle === 'typewriter' || scene.typographyStyle === 'mask-reveal' || scene.typographyStyle === 'handwritten') {
    const reveal = clamp((localTime - token.start) / (scene.typographyStyle === 'handwritten' ? 0.72 : 0.24), 0, 1);
    ctx.beginPath();
    ctx.rect(-fontSize * 0.2, -fontSize * 0.75, token.width * reveal + fontSize * 0.2, fontSize * 1.5);
    ctx.clip();
  }

  fillText(ctx, token.value, 0, 0, letterSpacing);
  if (scene.typographyStyle === 'handwritten') {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = scene.accent;
    ctx.lineWidth = Math.max(3, fontSize * 0.035);
    ctx.beginPath();
    ctx.moveTo(0, fontSize * 0.55);
    ctx.quadraticCurveTo(token.width * 0.48, fontSize * 0.72, token.width, fontSize * 0.52);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawSceneBackdrop(ctx: CanvasRenderingContext2D, settings: RenderSettings, scene: CaptionScene, localTime: number) {
  if (
    scene.animationStyle !== 'lower-third' &&
    scene.animationStyle !== 'news-ticker' &&
    scene.animationStyle !== 'tech-hud' &&
    scene.typographyStyle !== 'ui-tech' &&
    scene.typographyStyle !== 'retro'
  ) {
    return;
  }

  const safe = getSafeBounds(settings);
  const isHud = scene.animationStyle === 'tech-hud' || scene.typographyStyle === 'ui-tech';
  const y = isHud ? settings.height * 0.72 : settings.height * (1 - safe.bottom) - settings.height * 0.12;
  const h = settings.height * (scene.animationStyle === 'news-ticker' ? 0.1 : 0.14);
  const intro = easeOutCubic(localTime / 0.38);
  ctx.save();
  ctx.globalAlpha = intro * 0.86;
  ctx.fillStyle = isHud ? 'rgba(6, 18, 24, 0.84)' : scene.typographyStyle === 'retro' ? 'rgba(24, 12, 6, 0.72)' : 'rgba(0, 0, 0, 0.72)';
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
