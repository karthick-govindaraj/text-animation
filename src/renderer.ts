export type AnimationStyle = 'punch' | 'cascade' | 'typewriter' | 'drift';
export type AspectRatio = '16:9' | '9:16' | '1:1';

export type RenderSettings = {
  text: string;
  style: AnimationStyle;
  width: number;
  height: number;
  duration: number;
  fps: number;
  fontFamily: string;
  foreground: string;
  accent: string;
  shadow: string;
};

type WordToken = {
  value: string;
  start: number;
  end: number;
  line: number;
  x: number;
  y: number;
  width: number;
  emphasis: number;
};

export const DEFAULT_TEXT =
  'Your idea becomes kinetic text. Type a hook, preview the rhythm, then export it for your edit.';

export const PRESETS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '16:9': { width: 1920, height: 1080, label: '1920 x 1080' },
  '9:16': { width: 1080, height: 1920, label: '1080 x 1920' },
  '1:1': { width: 1080, height: 1080, label: '1080 x 1080' }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
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

export function getFrameCount(settings: RenderSettings) {
  return Math.ceil(settings.duration * settings.fps);
}

function getBaseFontSize(settings: RenderSettings) {
  const shortestSide = Math.min(settings.width, settings.height);
  const density = normalizeText(settings.text).split(' ').length > 18 ? 0.072 : 0.086;
  return Math.round(clamp(shortestSide * density, 52, 132));
}

function prepareContext(ctx: CanvasRenderingContext2D, settings: RenderSettings) {
  const fontSize = getBaseFontSize(settings);
  ctx.font = `900 ${fontSize}px ${settings.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  return fontSize;
}

function layoutWords(ctx: CanvasRenderingContext2D, settings: RenderSettings) {
  const source = normalizeText(settings.text) || DEFAULT_TEXT;
  const rawWords = source.split(' ').filter(Boolean);
  const fontSize = prepareContext(ctx, settings);
  const gap = fontSize * 0.26;
  const lineHeight = fontSize * 1.08;
  const maxWidth = settings.width * 0.78;
  const lineWords: Omit<WordToken, 'line' | 'x' | 'y'>[][] = [];
  let current: Omit<WordToken, 'line' | 'x' | 'y'>[] = [];
  let currentWidth = 0;
  const readableDuration = settings.duration * 0.82;
  const step = readableDuration / rawWords.length;

  rawWords.forEach((word, index) => {
    const clean = word.replace(/[^\w'-]/g, '');
    const emphasis = clean.length > 7 || /[!?]$/.test(word) ? 1 : 0;
    const width = ctx.measureText(word).width;
    const projected = currentWidth + (current.length > 0 ? gap : 0) + width;
    if (current.length > 0 && projected > maxWidth) {
      lineWords.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push({
      value: word,
      start: 0.18 + index * step,
      end: 0.18 + index * step + Math.max(0.64, step * 2.4),
      width,
      emphasis
    });
    currentWidth += (current.length > 1 ? gap : 0) + width;
  });

  if (current.length > 0) {
    lineWords.push(current);
  }

  const totalHeight = (lineWords.length - 1) * lineHeight;
  const startY = settings.height * 0.5 - totalHeight / 2;

  return lineWords.flatMap((line, lineIndex) => {
    const lineWidth = line.reduce((sum, word, i) => sum + word.width + (i > 0 ? gap : 0), 0);
    let x = settings.width * 0.5 - lineWidth / 2;
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

function drawWord(
  ctx: CanvasRenderingContext2D,
  token: WordToken,
  settings: RenderSettings,
  time: number,
  fontSize: number
) {
  const intro = easeOutCubic((time - token.start) / 0.36);
  const outro = 1 - easeInOut((time - (settings.duration - 0.5)) / 0.44);
  const active = time >= token.start && time <= token.end;
  const pulse = active ? Math.sin((time - token.start) * Math.PI * 3.2) * 0.035 : 0;
  const alpha = clamp(intro * outro, 0, 1);

  if (alpha <= 0) {
    return;
  }

  let x = token.x;
  let y = token.y;
  let rotation = 0;
  let scale = 0.96 + intro * 0.04 + pulse + token.emphasis * intro * 0.018;

  if (settings.style === 'cascade') {
    y += (1 - intro) * (fontSize * 0.8 + token.line * 18);
    rotation = (1 - intro) * -0.04;
  } else if (settings.style === 'typewriter') {
    scale = 1;
  } else if (settings.style === 'drift') {
    x += Math.sin(time * 1.4 + token.line) * 8 + (1 - intro) * -32;
    y += Math.cos(time * 1.1 + token.x * 0.01) * 5;
  } else {
    y += (1 - intro) * 24;
    scale += (1 - intro) * 0.28;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + token.width / 2, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-token.width / 2, 0);

  const padX = fontSize * 0.18;
  const padY = fontSize * 0.2;
  if (active) {
    ctx.save();
    ctx.globalAlpha = 0.95 * alpha;
    ctx.fillStyle = settings.accent;
    roundRect(ctx, -padX, -fontSize * 0.53 - padY * 0.24, token.width + padX * 2, fontSize * 1.06, fontSize * 0.16);
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowColor = settings.shadow;
  ctx.shadowBlur = active ? 32 : 18;
  ctx.shadowOffsetY = active ? 10 : 6;
  ctx.lineWidth = Math.max(5, fontSize * 0.06);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.strokeText(token.value, 0, 0);
  ctx.fillStyle = active ? '#FFFFFF' : settings.foreground;

  if (settings.style === 'typewriter') {
    const reveal = clamp((time - token.start) / 0.24, 0, 1);
    ctx.beginPath();
    ctx.rect(-padX, -fontSize * 0.7, token.width * reveal + padX, fontSize * 1.4);
    ctx.clip();
  }

  ctx.fillText(token.value, 0, 0);
  ctx.restore();
}

export function renderFrame(
  canvas: HTMLCanvasElement,
  settings: RenderSettings,
  time: number,
  options: { preview?: boolean } = {}
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

  const fontSize = prepareContext(ctx, settings);
  const words = layoutWords(ctx, settings);

  if (options.preview) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = Math.max(2, settings.width * 0.002);
    roundRect(ctx, settings.width * 0.08, settings.height * 0.12, settings.width * 0.84, settings.height * 0.76, 32);
    ctx.stroke();
    ctx.restore();
  }

  const markerTime = Math.max(0, time - 0.08);
  words.forEach((word) => drawWord(ctx, word, settings, markerTime, fontSize));
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
