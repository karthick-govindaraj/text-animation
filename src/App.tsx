import { useEffect, useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Copy,
  Download,
  Film,
  Layers3,
  Loader2,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Type,
  Wand2
} from 'lucide-react';
import {
  AspectRatio,
  BrandKit,
  CaptionScene,
  DEFAULT_BRAND,
  DEFAULT_FONT,
  FONT_FAMILIES,
  FontControls,
  HighlightShape,
  SCENE_TEMPLATES,
  STYLE_PRESETS,
  SafeAreaPreset,
  TYPOGRAPHY_PRESETS,
  TextAlign,
  canvasToPng,
  createScene,
  estimateDuration,
  getActiveScene,
  getAspectSize,
  getFrameCount,
  getTotalDuration,
  renderFrame
} from './renderer';
import { exportAlphaWebm, exportMp4 } from './videoExport';

type ExportKind = 'mp4' | 'webm-alpha' | 'mov-alpha';

const FF_VERSION = '0.12.10';
const BRAND_STORAGE_KEY = 'kinetic-text-brand-kit';
const FONT_STORAGE_KEY = 'kinetic-text-font-controls';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function filePrefix() {
  return `kinetic-text-${Date.now()}`;
}

async function waitForFonts() {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
}

function loadStoredValue<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

function makeScenes(templateIndex = 0) {
  return SCENE_TEMPLATES[templateIndex].scenes.map((scene) => createScene(scene));
}

export default function App() {
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const pausedAtRef = useRef(0);

  const [scenes, setScenes] = useState<CaptionScene[]>(() => makeScenes());
  const [activeSceneId, setActiveSceneId] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const [fps, setFps] = useState(30);
  const [safeArea, setSafeArea] = useState<SafeAreaPreset>('tiktok');
  const [showGuides, setShowGuides] = useState(true);
  const [font, setFont] = useState<FontControls>(() => loadStoredValue(FONT_STORAGE_KEY, DEFAULT_FONT));
  const [brand, setBrand] = useState<BrandKit>(() => loadStoredValue(BRAND_STORAGE_KEY, DEFAULT_BRAND));
  const [isPlaying, setIsPlaying] = useState(true);
  const [playhead, setPlayhead] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const size = getAspectSize(aspect);
  const duration = useMemo(() => getTotalDuration(scenes), [scenes]);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];

  const settings = useMemo(
    () => ({
      scenes,
      width: size.width,
      height: size.height,
      duration,
      fps,
      font,
      brand,
      foreground: '#F4F2EA',
      safeArea
    }),
    [brand, duration, font, fps, safeArea, scenes, size.height, size.width]
  );

  const frameCount = getFrameCount(settings);
  const previewScene = getActiveScene(settings, Math.min(playhead, Math.max(0, duration - 0.01)));

  useEffect(() => {
    const firstScene = scenes[0];
    if (!activeSceneId && firstScene) {
      setActiveSceneId(firstScene.id);
    }
  }, [activeSceneId, scenes]);

  useEffect(() => {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
  }, [brand]);

  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(font));
  }, [font]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) {
      return;
    }

    const draw = (now: number) => {
      if (isPlaying) {
        if (startRef.current === 0) {
          startRef.current = now - pausedAtRef.current * 1000;
        }
        const nextTime = duration > 0 ? ((now - startRef.current) / 1000) % duration : 0;
        pausedAtRef.current = nextTime;
        setPlayhead(nextTime);
        renderFrame(canvas, settings, nextTime, { preview: true, guides: showGuides });
        rafRef.current = requestAnimationFrame(draw);
      } else {
        startRef.current = 0;
        renderFrame(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, isPlaying, settings, showGuides]);

  useEffect(() => {
    pausedAtRef.current = Math.min(pausedAtRef.current, Math.max(0, duration - 0.01));
    const canvas = previewRef.current;
    if (canvas) {
      renderFrame(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
    }
  }, [duration, settings, showGuides]);

  const getSceneStart = (sceneId: string) => {
    let cursor = 0;
    for (const scene of scenes) {
      if (scene.id === sceneId) {
        return cursor;
      }
      cursor += scene.duration;
    }
    return 0;
  };

  const updateScene = (sceneId: string, patch: Partial<CaptionScene>) => {
    setScenes((current) => current.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene)));
  };

  const addScene = () => {
    const scene = createScene({
      title: `Scene ${scenes.length + 1}`,
      text: 'Add your next caption beat.',
      animationStyle: activeScene?.animationStyle ?? 'shorts-pop',
      typographyStyle: activeScene?.typographyStyle ?? 'cinematic',
      accent: activeScene?.accent ?? brand.colors[0],
      duration: 3.5
    });
    setScenes((current) => [...current, scene]);
    setActiveSceneId(scene.id);
    pausedAtRef.current = duration;
    setPlayhead(duration);
    setIsPlaying(false);
  };

  const duplicateScene = (scene: CaptionScene) => {
    const duplicate = createScene({ ...scene, id: undefined, title: `${scene.title} Copy` });
    setScenes((current) => {
      const index = current.findIndex((item) => item.id === scene.id);
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
    setActiveSceneId(duplicate.id);
    setIsPlaying(false);
  };

  const deleteScene = (sceneId: string) => {
    setScenes((current) => {
      if (current.length === 1) {
        return current;
      }
      const next = current.filter((scene) => scene.id !== sceneId);
      if (sceneId === activeSceneId) {
        setActiveSceneId(next[0].id);
      }
      return next;
    });
  };

  const applyTemplate = (templateIndex: number) => {
    const nextScenes = makeScenes(templateIndex);
    setScenes(nextScenes);
    setActiveSceneId(nextScenes[0].id);
    setPlayhead(0);
    pausedAtRef.current = 0;
    startRef.current = 0;
    setIsPlaying(false);
  };

  const seek = (value: number) => {
    const next = Number(value);
    pausedAtRef.current = next;
    setPlayhead(next);
    setIsPlaying(false);
    const canvas = previewRef.current;
    if (canvas) {
      renderFrame(canvas, settings, next, { preview: true, guides: showGuides });
    }
  };

  const selectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    seek(getSceneStart(sceneId));
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setExportLabel('Loading FFmpeg.wasm');
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      if (message.includes('frame=')) {
        setExportLabel('Encoding MOV');
      }
    });
    ffmpeg.on('progress', ({ progress: ratio }) => {
      if (ratio > 0 && ratio <= 1) {
        setProgress(Math.round(ratio * 100));
      }
    });

    const baseURL = `https://unpkg.com/@ffmpeg/core@${FF_VERSION}/dist/umd`;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const writeFrames = async (ffmpeg: FFmpeg, canvas: HTMLCanvasElement) => {
    const names: string[] = [];
    for (let frame = 0; frame < frameCount; frame += 1) {
      const name = `frame_${String(frame + 1).padStart(4, '0')}.png`;
      const time = frame / fps;
      renderFrame(canvas, settings, time, { preview: false });
      const blob = await canvasToPng(canvas);
      await ffmpeg.writeFile(name, await fetchFile(blob));
      names.push(name);
      setProgress(Math.round((frame / frameCount) * 45));
      setExportLabel(`Rendering MOV frames ${frame + 1}/${frameCount}`);
    }
    return names;
  };

  const cleanupFiles = async (ffmpeg: FFmpeg, names: string[], output: string) => {
    await Promise.all(names.map((name) => ffmpeg.deleteFile(name).catch(() => undefined)));
    await ffmpeg.deleteFile(output).catch(() => undefined);
  };

  const exportVideo = async (kind: ExportKind) => {
    if (isExporting) {
      return;
    }

    setError('');
    setIsExporting(true);
    setProgress(0);
    setIsPlaying(false);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = settings.width;
    exportCanvas.height = settings.height;

    let names: string[] = [];
    const output = 'output-alpha.mov';
    let ffmpeg: FFmpeg | null = null;

    try {
      if (kind === 'mp4') {
        const blob = await exportMp4(settings, (nextProgress, nextLabel) => {
          setProgress(nextProgress);
          setExportLabel(nextLabel);
        });
        downloadBlob(blob, `${filePrefix()}.mp4`);
        setProgress(100);
        return;
      }

      if (kind === 'webm-alpha') {
        const blob = await exportAlphaWebm(settings, (nextProgress, nextLabel) => {
          setProgress(nextProgress);
          setExportLabel(nextLabel);
        });
        downloadBlob(blob, `${filePrefix()}-alpha.webm`);
        setProgress(100);
        return;
      }

      ffmpeg = await loadFFmpeg();
      await waitForFonts();
      names = await writeFrames(ffmpeg, exportCanvas);
      setExportLabel('Encoding alpha MOV');
      setProgress(48);

      await ffmpeg.exec([
        '-framerate',
        String(fps),
        '-i',
        'frame_%04d.png',
        '-c:v',
        'prores_ks',
        '-profile:v',
        '4',
        '-pix_fmt',
        'yuva444p10le',
        '-vendor',
        'apl0',
        output
      ]);

      setExportLabel('Preparing download');
      const data = await ffmpeg.readFile(output);
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      downloadBlob(new Blob([bytes.slice()], { type: 'video/quicktime' }), `${filePrefix()}-alpha.mov`);
      setProgress(100);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : 'Export failed. Try MP4 or Alpha WebM for long videos.');
    } finally {
      if (ffmpeg) {
        await cleanupFiles(ffmpeg, names, output);
      }
      setIsExporting(false);
      setExportLabel('');
      const canvas = previewRef.current;
      if (canvas) {
        renderFrame(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
      }
    }
  };

  const updateBrandColor = (index: number, color: string) => {
    setBrand((current) => ({
      ...current,
      colors: current.colors.map((item, itemIndex) => (itemIndex === index ? color : item))
    }));
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <Type size={19} />
            </div>
            <div>
              <p className="eyebrow">Scene-based transparent text animation</p>
              <h1>Kinetic Text Studio</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => setIsPlaying((value) => !value)}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button className="primary-button" disabled={isExporting} onClick={() => exportVideo('mp4')}>
              {isExporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
              Download MP4
            </button>
          </div>
        </header>

        <div className="main-grid">
          <aside className="panel controls-panel">
            <div className="panel-heading">
              <Layers3 size={18} />
              <span>Scenes</span>
            </div>

            <div className="template-row">
              <select onChange={(event) => applyTemplate(Number(event.target.value))} defaultValue="0">
                {SCENE_TEMPLATES.map((template, index) => (
                  <option key={template.id} value={index}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button className="icon-button" onClick={addScene} title="Add scene">
                <Plus size={17} />
              </button>
            </div>

            <div className="scene-list">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  className={scene.id === activeSceneId ? 'scene-card active' : 'scene-card'}
                  onClick={() => selectScene(scene.id)}
                >
                  <span className="scene-index">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>{scene.title}</strong>
                    <small>
                      {scene.duration.toFixed(1)}s · {STYLE_PRESETS.find((item) => item.id === scene.animationStyle)?.label} ·{' '}
                      {TYPOGRAPHY_PRESETS.find((item) => item.id === scene.typographyStyle)?.label}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            {activeScene && (
              <>
                <div className="field-row">
                  <label>Scene Title</label>
                  <input
                    value={activeScene.title}
                    onChange={(event) => updateScene(activeScene.id, { title: event.target.value })}
                  />
                </div>

                <div className="field-row">
                  <label>Scene Text</label>
                  <textarea
                    value={activeScene.text}
                    onChange={(event) => updateScene(activeScene.id, { text: event.target.value })}
                    placeholder="Type this scene caption..."
                    spellCheck="true"
                  />
                </div>

                <div className="compact-actions">
                  <button className="ghost-button" onClick={() => updateScene(activeScene.id, { duration: estimateDuration(activeScene.text) })}>
                    <RefreshCw size={16} />
                    Auto Time
                  </button>
                  <button className="ghost-button" onClick={() => duplicateScene(activeScene)}>
                    <Copy size={16} />
                    Duplicate
                  </button>
                  <button className="ghost-button danger" onClick={() => deleteScene(activeScene.id)} disabled={scenes.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="field-grid">
                  <label>
                    Duration
                    <input
                      type="number"
                      min="0.5"
                      max="300"
                      step="0.1"
                      value={activeScene.duration}
                      onChange={(event) => updateScene(activeScene.id, { duration: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Accent
                    <input
                      type="color"
                      value={activeScene.accent}
                      onChange={(event) => updateScene(activeScene.id, { accent: event.target.value })}
                    />
                  </label>
                </div>
              </>
            )}
          </aside>

          <section className="preview-stage">
            <div className="preview-toolbar">
              <div>
                <p className="eyebrow">Real-time preview</p>
                <strong>
                  {previewScene.scene.title} · {getAspectSize(aspect).label}
                </strong>
              </div>
              <div className="time-readout">
                {playhead.toFixed(2)}s / {duration.toFixed(2)}s
              </div>
            </div>
            <div className={`canvas-frame aspect-${aspect.replace(':', '-')}`}>
              <canvas ref={previewRef} />
            </div>
            <input
              className="timeline"
              type="range"
              min="0"
              max={duration}
              step="0.01"
              value={playhead}
              onChange={(event) => seek(Number(event.target.value))}
            />
          </section>

          <aside className="panel export-panel">
            <div className="panel-heading">
              <Wand2 size={18} />
              <span>Animation Presets</span>
            </div>
            <div className="style-list preset-list">
              {STYLE_PRESETS.map((item) => (
                <button
                  key={item.id}
                  className={activeScene?.animationStyle === item.id ? 'style-card active' : 'style-card'}
                  onClick={() => activeScene && updateScene(activeScene.id, { animationStyle: item.id })}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Sparkles size={18} />
              <span>Typography Styles</span>
            </div>
            {activeScene && (
              <div className="current-pair">
                <span>Animation: {STYLE_PRESETS.find((item) => item.id === activeScene.animationStyle)?.label}</span>
                <span>Typography: {TYPOGRAPHY_PRESETS.find((item) => item.id === activeScene.typographyStyle)?.label}</span>
              </div>
            )}
            <div className="style-list preset-list typography-list">
              {TYPOGRAPHY_PRESETS.map((item) => (
                <button
                  key={item.id}
                  className={activeScene?.typographyStyle === item.id ? 'style-card active' : 'style-card'}
                  onClick={() => activeScene && updateScene(activeScene.id, { typographyStyle: item.id })}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Type size={18} />
              <span>Font Controls</span>
            </div>

            <div className="field-row">
              <label>Font Family</label>
              <select
                value={font.family}
                onChange={(event) => {
                  const selected = FONT_FAMILIES.find((item) => item.family === event.target.value);
                  setFont((current) => ({ ...current, family: event.target.value, weight: selected?.weight ?? current.weight }));
                }}
              >
                {FONT_FAMILIES.map((fontOption) => (
                  <option key={fontOption.family} value={fontOption.family}>
                    {fontOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="slider-grid">
              <label>
                Weight <strong>{font.weight}</strong>
                <input
                  type="range"
                  min="400"
                  max="900"
                  step="100"
                  value={font.weight}
                  onChange={(event) => setFont((current) => ({ ...current, weight: Number(event.target.value) }))}
                />
              </label>
              <label>
                Size <strong>{font.sizeScale.toFixed(2)}x</strong>
                <input
                  type="range"
                  min="0.55"
                  max="1.6"
                  step="0.05"
                  value={font.sizeScale}
                  onChange={(event) => setFont((current) => ({ ...current, sizeScale: Number(event.target.value) }))}
                />
              </label>
              <label>
                Letter <strong>{font.letterSpacing}px</strong>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={font.letterSpacing}
                  onChange={(event) => setFont((current) => ({ ...current, letterSpacing: Number(event.target.value) }))}
                />
              </label>
              <label>
                Line <strong>{font.lineHeight.toFixed(2)}</strong>
                <input
                  type="range"
                  min="0.85"
                  max="1.5"
                  step="0.05"
                  value={font.lineHeight}
                  onChange={(event) => setFont((current) => ({ ...current, lineHeight: Number(event.target.value) }))}
                />
              </label>
              <label>
                Stroke <strong>{font.strokeWidth.toFixed(2)}</strong>
                <input
                  type="range"
                  min="0"
                  max="0.14"
                  step="0.01"
                  value={font.strokeWidth}
                  onChange={(event) => setFont((current) => ({ ...current, strokeWidth: Number(event.target.value) }))}
                />
              </label>
              <label>
                Shadow <strong>{font.shadowBlur}px</strong>
                <input
                  type="range"
                  min="0"
                  max="64"
                  step="2"
                  value={font.shadowBlur}
                  onChange={(event) => setFont((current) => ({ ...current, shadowBlur: Number(event.target.value) }))}
                />
              </label>
              <label>
                Words / line <strong>{font.maxWordsPerLine}</strong>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={font.maxWordsPerLine}
                  onChange={(event) => setFont((current) => ({ ...current, maxWordsPerLine: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className="field-grid">
              <label>
                Highlight
                <select
                  value={font.highlightShape}
                  onChange={(event) => setFont((current) => ({ ...current, highlightShape: event.target.value as HighlightShape }))}
                >
                  <option value="pill">Pill</option>
                  <option value="box">Box</option>
                  <option value="underline">Underline</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label>
                Position
                <select
                  value={font.position}
                  onChange={(event) => setFont((current) => ({ ...current, position: event.target.value as FontControls['position'] }))}
                >
                  <option value="upper">Upper</option>
                  <option value="center">Center</option>
                  <option value="lower">Lower</option>
                  <option value="safe-lower">Safe Lower</option>
                </select>
              </label>
            </div>

            <div className="field-row">
              <label>Text Alignment</label>
              <div className="segmented segmented-four">
                {(['left', 'center', 'right', 'justify'] as TextAlign[]).map((align) => (
                  <button
                    key={align}
                    className={font.textAlign === align ? 'active' : ''}
                    onClick={() => setFont((current) => ({ ...current, textAlign: align }))}
                  >
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={font.uppercase}
                onChange={(event) => setFont((current) => ({ ...current, uppercase: event.target.checked }))}
              />
              Uppercase captions
            </label>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Shield size={18} />
              <span>Safe Area</span>
            </div>
            <div className="field-grid">
              <label>
                Aspect
                <select value={aspect} onChange={(event) => setAspect(event.target.value as AspectRatio)}>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="16:9">16:9 Wide</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </label>
              <label>
                Platform
                <select value={safeArea} onChange={(event) => setSafeArea(event.target.value as SafeAreaPreset)}>
                  <option value="none">None</option>
                  <option value="tiktok">TikTok</option>
                  <option value="reels">Reels</option>
                  <option value="shorts">Shorts</option>
                </select>
              </label>
              <label className="toggle-field wide">
                <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
                Show guides
              </label>
            </div>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Palette size={18} />
              <span>Brand Kit</span>
            </div>
            <div className="brand-colors">
              {brand.colors.map((color, index) => (
                <input key={`${color}-${index}`} type="color" value={color} onChange={(event) => updateBrandColor(index, event.target.value)} />
              ))}
            </div>
            <div className="compact-actions">
              {brand.colors.map((color, index) => (
                <button
                  key={`${color}-apply-${index}`}
                  className="swatch-button"
                  style={{ backgroundColor: color }}
                  onClick={() => activeScene && updateScene(activeScene.id, { accent: color })}
                  title="Apply brand color"
                />
              ))}
            </div>
            <div className="field-row">
              <label>Watermark</label>
              <input value={brand.watermark} onChange={(event) => setBrand((current) => ({ ...current, watermark: event.target.value }))} />
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={brand.watermarkEnabled}
                onChange={(event) => setBrand((current) => ({ ...current, watermarkEnabled: event.target.checked }))}
              />
              Render watermark
            </label>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Film size={18} />
              <span>Export</span>
            </div>
            <div className="export-stat">
              <span>Scenes</span>
              <strong>{scenes.length}</strong>
            </div>
            <div className="export-stat">
              <span>Frames</span>
              <strong>{frameCount}</strong>
            </div>
            <div className="export-stat">
              <span>FPS</span>
              <select value={fps} onChange={(event) => setFps(Number(event.target.value))}>
                <option value={24}>24</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>

            <button className="primary-button full" disabled={isExporting} onClick={() => exportVideo('mp4')}>
              <Download size={18} />
              Download MP4
            </button>
            <p className="format-note">
              MP4 and Alpha WebM use WebCodecs for long exports. Alpha MOV is ProRes 4444 and heavier for long timelines.
            </p>

            <button className="ghost-button full" disabled={isExporting} onClick={() => exportVideo('webm-alpha')}>
              <Sparkles size={18} />
              Alpha WebM
            </button>
            <button className="ghost-button full" disabled={isExporting} onClick={() => exportVideo('mov-alpha')}>
              <Sparkles size={18} />
              Alpha MOV
            </button>
            <button
              className="ghost-button full"
              onClick={() => {
                localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
                localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(font));
              }}
            >
              <Save size={18} />
              Save Brand Preset
            </button>

            {isExporting && (
              <div className="progress-card">
                <div className="progress-title">
                  <RefreshCw className="spin" size={16} />
                  <span>{exportLabel || 'Working'}</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${progress}%` }} />
                </div>
                <small>{progress}%</small>
              </div>
            )}

            {error && <p className="error">{error}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}
