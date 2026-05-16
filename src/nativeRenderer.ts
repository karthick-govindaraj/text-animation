import { invoke } from '@tauri-apps/api/core';
import { isDesktopApp } from './desktop';
import type { AnimationStyle, CaptionScene, FontControls, SafeAreaPreset, TextAlign } from './renderer';

/* ─── Rust-side mirror types ─── */

export type NativeScene = {
  id: string;
  text: string;
  duration: number;
  animationStyle: AnimationStyle;
  accent: string;
  activeWordCount: number;
  offsetX: number;
  offsetY: number;
  wordColors: Record<string, string>;
  imageLayers?: NativeImageLayer[];
  camera?: NativeCameraMotion;
  transition?: NativeSceneTransition;
  graphicLayers?: NativeGraphicLayer[];
  videoLayers?: NativeVideoLayer[];
};

export type NativeGraphicLayer = {
  graphicType?: string;
  assetPath?: string;
  legacyJson?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  start?: number;
  end?: number;
  zIndex?: number;
  keyframes?: NativeKeyframe[];
};

export type NativeVideoLayer = {
  path: string;
  start?: number;
  end?: number;
  trimIn?: number;
  trimOut?: number;
  speed?: number;
  mute?: boolean;
  opacity?: number;
  fit?: string;
  crop?: { x: number; y: number; width: number; height: number };
  entrance?: string;
  exit?: string;
  zIndex?: number;
  chromaKey?: NativeChromaKey;
  keyframes?: NativeKeyframe[];
};

export type NativeKeyframe = {
  time: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  easing?: string;
};

export type NativeChromaKey = {
  enabled?: boolean;
  keyColor?: string;
  similarity?: number;
  smoothness?: number;
  spillReduction?: number;
  edgeSoftness?: number;
  preset?: string;
};

export type NativeImageLayer = {
  path: string;
  fallbacks?: string[];
  start?: number;
  end?: number;
  zIndex?: number;
  fit?: 'cover' | 'contain' | 'stretch';
  opacity?: number;
  blur?: number;
  darken?: number;
  vignette?: number;
  crop?: { x: number; y: number; width: number; height: number };
  entrance?: string;
  exit?: string;
};

export type NativeCameraMotion = {
  zoomFrom?: number;
  zoomTo?: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  easing?: string;
};

export type NativeSceneTransition = {
  transitionType?: string;
  duration?: number;
};

export type NativeFontControls = {
  family: string;
  weight: number;
  sizeScale: number;
  uppercase: boolean;
  letterSpacing: number;
  lineHeight: number;
  strokeWidth: number;
  shadowBlur: number;
  maxWordsPerLine: number;
  textAlign: TextAlign;
  textColor: string;
  highlightShape: string;
  position: string;
  textColorMode: string;
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
  gradientDirection: number;
};

export type NativeRenderProject = {
  width: number;
  height: number;
  fps: number;
  duration: number;
  scenes: NativeScene[];
  font: NativeFontControls;
  safeArea: string;
};

export type NativeLayoutWord = {
  value: string;
  sourceIndex: number;
  line: number;
  x: number;
  y: number;
};

export type NativeLayoutLine = {
  lineIndex: number;
  words: NativeLayoutWord[];
  y: number;
};

export type NativeLayoutResult = {
  sceneId: string;
  lines: NativeLayoutLine[];
  totalLines: number;
  canvasWidth: number;
  canvasHeight: number;
};

/* ─── Conversion helpers ─── */

function toNativeScene(scene: CaptionScene): NativeScene {
  // Convert numeric-keyed wordColors to string-keyed for Rust HashMap<String, String>
  const wordColors: Record<string, string> = {};
  if (scene.wordColors) {
    for (const [k, v] of Object.entries(scene.wordColors)) {
      wordColors[String(k)] = v;
    }
  }

  const brollAssets = [...(scene.broll?.assets ?? [])].sort((a, b) => a.rank - b.rank);
  const selectedAsset =
    brollAssets.find((asset) => asset.id === scene.broll?.selectedAssetId) ?? brollAssets[0];
  const fallbackAssets = brollAssets.filter((asset) => asset.id !== selectedAsset?.id);

  const imageLayers: NativeImageLayer[] = scene.broll?.enabled && selectedAsset?.imageUrl
    ? [{
        path: selectedAsset.imageUrl,
        fallbacks: fallbackAssets.map((asset) => asset.imageUrl).filter(Boolean),
        start: 0,
        end: Math.max(0.1, scene.duration),
        zIndex: 0,
        fit: scene.broll.fit,
        opacity: scene.broll.opacity,
        blur: scene.broll.blur,
        darken: scene.broll.darken,
        vignette: scene.broll.vignette,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        entrance: 'fade-in',
        exit: 'none',
      }]
    : [];

  const camera: NativeCameraMotion | undefined = scene.camera?.enabled
    ? {
        zoomFrom: scene.camera.zoomFrom,
        zoomTo: scene.camera.zoomTo,
        panXFrom: scene.camera.panXFrom,
        panXTo: scene.camera.panXTo,
        panYFrom: scene.camera.panYFrom,
        panYTo: scene.camera.panYTo,
        easing: scene.camera.easing === 'linear' ? 'linear' : 'ease-in-out',
      }
    : undefined;

  const transition: NativeSceneTransition | undefined =
    scene.transitionIn && scene.transitionIn.type !== 'none' && scene.transitionIn.duration > 0
      ? {
          transitionType: scene.transitionIn.type,
          duration: scene.transitionIn.duration,
        }
      : undefined;

  const graphicLayers: NativeGraphicLayer[] = (scene.graphics ?? []).map((graphic, index) => ({
    graphicType: graphic.type,
    legacyJson: JSON.stringify(graphic),
    x: graphic.x,
    y: graphic.y,
    width: 0.35,
    height: 0.12,
    opacity: 1,
    rotation: 0,
    start: graphic.start,
    end: graphic.end,
    zIndex: 20 + index,
  }));

  return {
    id: scene.id,
    text: scene.text,
    duration: Math.max(0.1, scene.duration),
    animationStyle: scene.animationStyle,
    accent: scene.accent,
    activeWordCount: scene.activeWordCount,
    offsetX: scene.offsetX,
    offsetY: scene.offsetY,
    wordColors,
    imageLayers,
    camera,
    transition,
    graphicLayers,
  };
}

function toNativeFont(font: FontControls): NativeFontControls {
  return {
    family: font.family,
    weight: font.weight,
    sizeScale: font.sizeScale,
    uppercase: font.uppercase,
    letterSpacing: font.letterSpacing,
    lineHeight: font.lineHeight,
    strokeWidth: font.strokeWidth,
    shadowBlur: font.shadowBlur,
    maxWordsPerLine: font.maxWordsPerLine,
    textAlign: font.textAlign,
    textColor: font.textColor,
    highlightShape: font.highlightShape,
    position: font.position,
    textColorMode: font.textColorMode,
    gradientFrom: font.gradientFrom ?? '',
    gradientMid: font.gradientMid ?? '',
    gradientTo: font.gradientTo ?? '',
    gradientDirection: font.gradientDirection ?? 0,
  };
}

export function buildNativeRenderProject(
  scenes: CaptionScene[],
  width: number,
  height: number,
  fps: number,
  duration: number,
  font: FontControls,
  safeArea: SafeAreaPreset = 'none',
): NativeRenderProject {
  return {
    width,
    height,
    fps,
    duration,
    scenes: scenes.map(toNativeScene),
    font: toNativeFont(font),
    safeArea,
  };
}

/* ─── Tauri commands ─── */

export async function invokeDebugNativeLayout(
  project: NativeRenderProject,
): Promise<NativeLayoutResult> {
  if (!isDesktopApp()) {
    throw new Error('Native layout is only available in the Tauri desktop app.');
  }
  return invoke<NativeLayoutResult>('debug_native_layout', { project });
}

export async function invokeRenderNativeFramePng(
  project: NativeRenderProject,
  time: number,
): Promise<Uint8Array> {
  if (!isDesktopApp()) {
    throw new Error('Native rendering is only available in the Tauri desktop app.');
  }
  const bytes = await invoke<number[]>('render_native_frame_png', { project, time });
  return new Uint8Array(bytes);
}

/* ─── Throttled preview helper ─── */

let pendingRequest: AbortController | null = null;
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 40; // ~25fps max request rate

export async function requestNativePreviewFrame(
  project: NativeRenderProject,
  time: number,
): Promise<string> {
  // Cancel any in-flight request
  if (pendingRequest) {
    pendingRequest.abort();
  }

  // Throttle
  const now = performance.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }

  const controller = new AbortController();
  pendingRequest = controller;
  lastRequestTime = performance.now();

  try {
    const pngBytes = await invokeRenderNativeFramePng(project, time);

    // If aborted while waiting, discard
    if (controller.signal.aborted) {
      return '';
    }

    const blob = new Blob([pngBytes.buffer as ArrayBuffer], { type: 'image/png' });
    return URL.createObjectURL(blob);
  } finally {
    if (pendingRequest === controller) {
      pendingRequest = null;
    }
  }
}

/* ─── Feature gap warnings ─── */

export function getNativeRendererWarnings(font: FontControls): string[] {
  const warnings: string[] = [];
  if (font.textColorMode === 'gradient') {
    warnings.push('Gradient text uses per-word approximation in native renderer.');
  }
  if (font.highlightShape !== 'none') {
    warnings.push(`Highlight shape "${font.highlightShape}" is not yet rendered natively.`);
  }
  return warnings;
}
