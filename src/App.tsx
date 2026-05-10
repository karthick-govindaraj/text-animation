import { useEffect, useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Copy,
  Download,
  Film,
  FolderOpen,
  Image,
  Layers3,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Type,
  Wand2
} from 'lucide-react';
import {
  AUDIO_PRESETS,
  audioBufferToWav,
  getAudioPresetLabel,
  getSuggestedAudioPreset,
  playPreviewAudioHit,
  renderProjectAudio,
  startHowlerPreviewAudio
} from './audio';
import {
  AspectRatio,
  AudioSettings,
  BackgroundSettings,
  BrandKit,
  CaptionScene,
  DEFAULT_AUDIO,
  DEFAULT_BACKGROUND,
  DEFAULT_BRAND,
  DEFAULT_FONT,
  FONT_FAMILIES,
  FontControls,
  HighlightShape,
  SCENE_TEMPLATES,
  STYLE_PRESETS,
  SafeAreaPreset,
  TextColorMode,
  TextAlign,
  canvasToPng,
  createScene,
  estimateDuration,
  getActiveScene,
  getAspectSize,
  getFrameCount,
  getTotalDuration,
  normalizeText,
  renderFrameAsync
} from './renderer';
import { exportAlphaWebm, exportMp4 } from './videoExport';

type ExportKind = 'mp4' | 'webm-alpha' | 'mov-alpha';

const FF_VERSION = '0.12.10';
const FONT_STORAGE_KEY = 'kinetic-text-font-controls';
const PROJECT_FILE_VERSION = 1;
const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 25 * 1024 * 1024;

type ProjectSceneV1 = Omit<CaptionScene, 'typographyStyle'>;

type ProjectFileV1 = {
  version: 1;
  createdAt: string;
  scenes: ProjectSceneV1[];
  aspect: AspectRatio;
  fps: number;
  safeArea: SafeAreaPreset;
  showGuides: boolean;
  font: FontControls;
  brand: BrandKit;
  background: BackgroundSettings;
  audio: AudioSettings;
};

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

function serializeSceneForProject(scene: CaptionScene): ProjectSceneV1 {
  const projectScene = { ...scene } as Partial<CaptionScene>;
  delete projectScene.typographyStyle;
  return projectScene as ProjectSceneV1;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const stopAudioRef = useRef<(() => void) | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceInputRef = useRef<HTMLInputElement | null>(null);
  const voiceObjectUrlRef = useRef('');
  const projectInputRef = useRef<HTMLInputElement | null>(null);

  const [scenes, setScenes] = useState<CaptionScene[]>(() => makeScenes());
  const [activeSceneId, setActiveSceneId] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const [fps, setFps] = useState(30);
  const [safeArea, setSafeArea] = useState<SafeAreaPreset>('tiktok');
  const [showGuides, setShowGuides] = useState(true);
  const [font, setFont] = useState<FontControls>(() => loadStoredValue(FONT_STORAGE_KEY, DEFAULT_FONT));
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [background, setBackground] = useState<BackgroundSettings>(DEFAULT_BACKGROUND);
  const [audio, setAudio] = useState<AudioSettings>(DEFAULT_AUDIO);
  const [voicePreviewEnabled, setVoicePreviewEnabled] = useState(false);
  const [voicePreviewName, setVoicePreviewName] = useState('');
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
      safeArea,
      background,
      audio
    }),
    [audio, background, brand, duration, font, fps, safeArea, scenes, size.height, size.width]
  );

  const frameCount = getFrameCount(settings);
  const previewScene = getActiveScene(settings, Math.min(playhead, Math.max(0, duration - 0.01)));
  const activeSceneWords = useMemo(() => normalizeText(activeScene?.text ?? '').split(' ').filter(Boolean), [activeScene?.text]);

  useEffect(() => {
    const firstScene = scenes[0];
    if (!activeSceneId && firstScene) {
      setActiveSceneId(firstScene.id);
    }
  }, [activeSceneId, scenes]);

  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(font));
  }, [font]);

  useEffect(
    () => () => {
      stopAudioPreview();
      stopVoicePreview();
      if (voiceObjectUrlRef.current) {
        URL.revokeObjectURL(voiceObjectUrlRef.current);
      }
    },
    []
  );

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
        syncVoicePreviewTime(nextTime, false, true);
        void renderFrameAsync(canvas, settings, nextTime, { preview: true, guides: showGuides });
        rafRef.current = requestAnimationFrame(draw);
      } else {
        startRef.current = 0;
        void renderFrameAsync(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
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
      void renderFrameAsync(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
    }
  }, [duration, settings, showGuides]);

  useEffect(() => {
    if (isPlaying && audio.enabled) {
      startAudioPreview();
    } else if (!audio.enabled) {
      stopAudioPreview();
    }
  }, [audio.enabled, audio.preset, audio.autoSelect, audio.volume, audio.intensity]);

  useEffect(() => {
    if (isPlaying && voicePreviewEnabled) {
      startVoicePreview();
    } else if (!voicePreviewEnabled) {
      stopVoicePreview();
    }
  }, [voicePreviewEnabled, voicePreviewName]);

  const stopAudioPreview = () => {
    stopAudioRef.current?.();
    stopAudioRef.current = null;
  };

  const stopVoicePreview = () => {
    const audioElement = voiceAudioRef.current;
    if (audioElement) {
      audioElement.pause();
    }
  };

  const startAudioPreview = () => {
    stopAudioPreview();
    if (!settings.audio.enabled) {
      return;
    }
    try {
      stopAudioRef.current = startHowlerPreviewAudio(settings, () => pausedAtRef.current);
    } catch (cause) {
      console.warn('Audio preview unavailable:', cause);
    }
  };

  const startVoicePreview = () => {
    const audioElement = voiceAudioRef.current;
    if (!voicePreviewEnabled || !audioElement || !voicePreviewName) {
      return;
    }
    syncVoicePreviewTime(pausedAtRef.current, true, false);
    void audioElement.play().catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Voice preview playback failed.');
    });
  };

  const syncVoicePreviewTime = (time: number, force = false, shouldPlay = isPlaying) => {
    const audioElement = voiceAudioRef.current;
    if (!voicePreviewEnabled || !audioElement || !voicePreviewName) {
      return;
    }

    const audioDuration = Number.isFinite(audioElement.duration) ? audioElement.duration : 0;
    const targetTime = audioDuration > 0 ? clampNumber(time, 0, Math.max(0, audioDuration - 0.04)) : Math.max(0, time);
    if (force || Math.abs(audioElement.currentTime - targetTime) > 0.22) {
      try {
        audioElement.currentTime = targetTime;
      } catch {
        return;
      }
    }

    if (shouldPlay && audioElement.paused && (!audioDuration || targetTime < audioDuration - 0.05)) {
      void audioElement.play().catch(() => undefined);
    }
  };

  const pausePreview = () => {
    stopAudioPreview();
    stopVoicePreview();
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      pausePreview();
      return;
    }
    startRef.current = 0;
    startAudioPreview();
    startVoicePreview();
    setIsPlaying(true);
  };

  const previewAudioOnce = () => {
    setError('');
    try {
      playPreviewAudioHit(settings, pausedAtRef.current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio preview failed.');
    }
  };

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

  const updateSceneActiveWordCount = (sceneId: string, value: number) => {
    const next = Math.min(Math.max(Math.round(Number(value) || 1), 1), 8);
    updateScene(sceneId, { activeWordCount: next });
  };

  const updateSceneWordColor = (sceneId: string, wordIndex: number, color: string) => {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              wordColors: {
                ...(scene.wordColors ?? {}),
                [wordIndex]: color
              }
            }
          : scene
      )
    );
  };

  const resetSceneWordColor = (sceneId: string, wordIndex: number) => {
    setScenes((current) =>
      current.map((scene) => {
        if (scene.id !== sceneId) {
          return scene;
        }
        const nextWordColors = { ...(scene.wordColors ?? {}) };
        delete nextWordColors[wordIndex];
        return { ...scene, wordColors: nextWordColors };
      })
    );
  };

  const addScene = () => {
    const scene = createScene({
      title: `Scene ${scenes.length + 1}`,
      text: 'Add your next caption beat.',
      animationStyle: activeScene?.animationStyle ?? 'shorts-pop',
      accent: activeScene?.accent ?? brand.colors[0],
      duration: 3.5
    });
    setScenes((current) => [...current, scene]);
    setActiveSceneId(scene.id);
    pausedAtRef.current = duration;
    setPlayhead(duration);
    pausePreview();
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
    pausePreview();
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
    pausePreview();
  };

  const seek = (value: number) => {
    const next = Number(value);
    pausedAtRef.current = next;
    setPlayhead(next);
    pausePreview();
    syncVoicePreviewTime(next, true, false);
    const canvas = previewRef.current;
    if (canvas) {
      void renderFrameAsync(canvas, settings, next, { preview: true, guides: showGuides });
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
      await renderFrameAsync(canvas, settings, time, { preview: false });
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
    pausePreview();

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
      let hasAudio = false;
      if (settings.audio.enabled) {
        try {
          setExportLabel('Rendering WAV audio');
          const audioBuffer = await renderProjectAudio(settings);
          if (audioBuffer) {
            await ffmpeg.writeFile('audio.wav', await fetchFile(audioBufferToWav(audioBuffer)));
            names.push('audio.wav');
            hasAudio = true;
          }
        } catch (cause) {
          console.warn('MOV audio export skipped:', cause);
        }
      }
      setExportLabel('Encoding alpha MOV');
      setProgress(48);

      const movArgs = [
        '-framerate',
        String(fps),
        '-i',
        'frame_%04d.png',
        ...(hasAudio ? ['-i', 'audio.wav'] : []),
        '-c:v',
        'prores_ks',
        '-profile:v',
        '4',
        '-pix_fmt',
        'yuva444p10le',
        '-vendor',
        'apl0',
        ...(hasAudio ? ['-c:a', 'pcm_s16le', '-shortest'] : []),
        output
      ];

      await ffmpeg.exec(movArgs);

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
        void renderFrameAsync(canvas, settings, pausedAtRef.current, { preview: true, guides: showGuides });
      }
    }
  };

  const exportProjectFile = () => {
    const project: ProjectFileV1 = {
      version: PROJECT_FILE_VERSION,
      createdAt: new Date().toISOString(),
      scenes: scenes.map(serializeSceneForProject),
      aspect,
      fps,
      safeArea,
      showGuides,
      font,
      brand,
      background,
      audio
    };
    downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), `${filePrefix()}-project.json`);
  };

  const importProjectFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const project = JSON.parse(await file.text()) as Partial<ProjectFileV1>;
      if (project.version !== PROJECT_FILE_VERSION || !Array.isArray(project.scenes) || project.scenes.length === 0) {
        throw new Error('Unsupported or invalid project file.');
      }

      const nextScenes = project.scenes.map((scene) => createScene(scene));
      setScenes(nextScenes);
      setActiveSceneId(nextScenes[0].id);
      setAspect(project.aspect ?? '9:16');
      setFps(project.fps ?? 30);
      setSafeArea(project.safeArea ?? 'tiktok');
      setShowGuides(project.showGuides ?? true);
      setFont({ ...DEFAULT_FONT, ...(project.font ?? {}) });
      setBrand({ ...DEFAULT_BRAND, ...(project.brand ?? {}) });
      setBackground({ ...DEFAULT_BACKGROUND, ...(project.background ?? {}) });
      setAudio({ ...DEFAULT_AUDIO, ...(project.audio ?? {}) });
      pausedAtRef.current = 0;
      setPlayhead(0);
      pausePreview();
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Project import failed. Current project was not changed.');
    } finally {
      if (projectInputRef.current) {
        projectInputRef.current.value = '';
      }
    }
  };

  const readBackgroundFile = async (file: File | null, mode: 'image' | 'video') => {
    if (!file) {
      return;
    }
    const limit = mode === 'image' ? IMAGE_LIMIT_BYTES : VIDEO_LIMIT_BYTES;
    if (file.size > limit) {
      setError(`${mode === 'image' ? 'Image' : 'Video'} background must be ${Math.round(limit / 1024 / 1024)} MB or smaller.`);
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read background file.'));
      reader.readAsDataURL(file);
    });
    setBackground((current) => ({
      ...current,
      mode,
      mediaDataUrl: dataUrl,
      mediaName: file.name
    }));
    setError('');
  };

  const readVoicePreviewFile = (file: File | null) => {
    if (!file) {
      return;
    }
    if (!file.type.includes('mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
      setError('Voice sync preview currently supports MP3 files only.');
      if (voiceInputRef.current) {
        voiceInputRef.current.value = '';
      }
      return;
    }

    stopVoicePreview();
    if (voiceObjectUrlRef.current) {
      URL.revokeObjectURL(voiceObjectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    voiceObjectUrlRef.current = url;
    const audioElement = new Audio(url);
    audioElement.preload = 'auto';
    audioElement.onloadedmetadata = () => syncVoicePreviewTime(pausedAtRef.current, true, false);
    voiceAudioRef.current = audioElement;
    setVoicePreviewName(file.name);
    if (voiceInputRef.current) {
      voiceInputRef.current.value = '';
    }
    setError('');
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
            <button className="ghost-button" onClick={togglePlayback}>
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
                    <small>{scene.duration.toFixed(1)}s · {STYLE_PRESETS.find((item) => item.id === scene.animationStyle)?.label}</small>
                  </span>
                </button>
              ))}
            </div>
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
              <Type size={18} />
              <span>Scene Controls</span>
            </div>
            <div className="scene-word-controls">
              <div className="scene-word-controls-title">Animated Words Per Scene</div>
              {scenes.map((scene, index) => (
                <label key={`${scene.id}-words`}>
                  <span>
                    {String(index + 1).padStart(2, '0')} · {scene.title}
                  </span>
                  <strong>{scene.activeWordCount}</strong>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={scene.activeWordCount}
                    onChange={(event) => updateSceneActiveWordCount(scene.id, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
            {activeScene && (
              <>
                <div className="field-row">
                  <label>Scene Title</label>
                  <input value={activeScene.title} onChange={(event) => updateScene(activeScene.id, { title: event.target.value })} />
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
                <div className="field-row">
                  <label>Per-word Colour</label>
                  <div className="word-color-grid">
                    {activeSceneWords.map((word, index) => (
                      <div className="word-color-row" key={`${activeScene.id}-${word}-${index}`}>
                        <span title={word}>{word}</span>
                        <input
                          type="color"
                          value={activeScene.wordColors?.[index] ?? font.textColor}
                          onChange={(event) => updateSceneWordColor(activeScene.id, index, event.target.value)}
                          title={`Set colour for ${word}`}
                        />
                        <button
                          className="mini-button"
                          type="button"
                          onClick={() => resetSceneWordColor(activeScene.id, index)}
                          disabled={!activeScene.wordColors?.[index]}
                        >
                          Reset
                        </button>
                      </div>
                    ))}
                  </div>
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
                    <input type="color" value={activeScene.accent} onChange={(event) => updateScene(activeScene.id, { accent: event.target.value })} />
                  </label>
                  <label>
                    Animated Words
                    <input
                      type="number"
                      min="1"
                      max="8"
                      step="1"
                      value={activeScene.activeWordCount}
                      onChange={(event) => updateSceneActiveWordCount(activeScene.id, Number(event.target.value))}
                    />
                  </label>
                </div>
                <div className="slider-grid">
                  <label>
                    X Offset <strong>{activeScene.offsetX ?? 0}%</strong>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={activeScene.offsetX ?? 0}
                      onChange={(event) => updateScene(activeScene.id, { offsetX: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Y Offset <strong>{activeScene.offsetY ?? 0}%</strong>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={activeScene.offsetY ?? 0}
                      onChange={(event) => updateScene(activeScene.id, { offsetY: Number(event.target.value) })}
                    />
                  </label>
                </div>
              </>
            )}
            <div className="panel-divider" />
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

            <div className="field-row">
              <label>Text Colour</label>
              <div className="segmented">
                {(['solid', 'gradient'] as TextColorMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={font.textColorMode === mode ? 'active' : ''}
                    onClick={() => setFont((current) => ({ ...current, textColorMode: mode }))}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {font.textColorMode === 'solid' ? (
              <div className="field-row">
                <label>Solid Text</label>
                <input
                  type="color"
                  value={font.textColor}
                  onChange={(event) => setFont((current) => ({ ...current, textColor: event.target.value }))}
                />
              </div>
            ) : (
              <div className="field-grid">
                <label>
                  From
                  <input
                    type="color"
                    value={font.gradientFrom}
                    onChange={(event) => setFont((current) => ({ ...current, gradientFrom: event.target.value }))}
                  />
                </label>
                <label>
                  Middle
                  <input
                    type="color"
                    value={font.gradientMid}
                    onChange={(event) => setFont((current) => ({ ...current, gradientMid: event.target.value }))}
                  />
                </label>
                <label>
                  To
                  <input
                    type="color"
                    value={font.gradientTo}
                    onChange={(event) => setFont((current) => ({ ...current, gradientTo: event.target.value }))}
                  />
                </label>
                <label className="wide">
                  Direction <strong>{font.gradientDirection}°</strong>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={font.gradientDirection}
                    onChange={(event) => setFont((current) => ({ ...current, gradientDirection: Number(event.target.value) }))}
                  />
                </label>
              </div>
            )}

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
              <Image size={18} />
              <span>Background Options</span>
            </div>
            <div className="field-row">
              <label>Preview Background</label>
              <div className="segmented segmented-five">
                {(['transparent', 'solid', 'gradient', 'image', 'video'] as BackgroundSettings['mode'][]).map((mode) => (
                  <button
                    key={mode}
                    className={background.mode === mode ? 'active' : ''}
                    onClick={() => setBackground((current) => ({ ...current, mode }))}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {background.mode === 'solid' && (
              <div className="field-row">
                <label>Solid Color</label>
                <input
                  type="color"
                  value={background.solidColor}
                  onChange={(event) => setBackground((current) => ({ ...current, solidColor: event.target.value }))}
                />
              </div>
            )}
            {background.mode === 'gradient' && (
              <div className="field-grid">
                <label>
                  From
                  <input
                    type="color"
                    value={background.gradientFrom}
                    onChange={(event) => setBackground((current) => ({ ...current, gradientFrom: event.target.value }))}
                  />
                </label>
                <label>
                  To
                  <input
                    type="color"
                    value={background.gradientTo}
                    onChange={(event) => setBackground((current) => ({ ...current, gradientTo: event.target.value }))}
                  />
                </label>
                <label className="wide">
                  Direction <strong>{background.gradientDirection}°</strong>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={background.gradientDirection}
                    onChange={(event) => setBackground((current) => ({ ...current, gradientDirection: Number(event.target.value) }))}
                  />
                </label>
              </div>
            )}
            {(background.mode === 'image' || background.mode === 'video') && (
              <>
                <div className="field-row">
                  <label>{background.mode === 'image' ? 'Image Background' : 'Video Background'}</label>
                  <input
                    type="file"
                    accept={background.mode === 'image' ? 'image/*' : 'video/*'}
                    onChange={(event) => void readBackgroundFile(event.target.files?.[0] ?? null, background.mode as 'image' | 'video')}
                  />
                  {background.mediaName && <p className="format-note">{background.mediaName}</p>}
                </div>
                <div className="field-row">
                  <label>Media Fit</label>
                  <select
                    value={background.mediaFit}
                    onChange={(event) => setBackground((current) => ({ ...current, mediaFit: event.target.value as BackgroundSettings['mediaFit'] }))}
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
              </>
            )}
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={background.includeInExport}
                onChange={(event) => setBackground((current) => ({ ...current, includeInExport: event.target.checked }))}
              />
              Include background in export
            </label>

            <div className="panel-divider" />
            <div className="panel-heading">
              <Music2 size={18} />
              <span>Audio Motion</span>
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={audio.enabled}
                onChange={(event) => {
                  setAudio((current) => ({ ...current, enabled: event.target.checked }));
                  if (!event.target.checked) {
                    stopAudioPreview();
                  }
                }}
              />
              Enable audio effects
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={voicePreviewEnabled}
                disabled={!voicePreviewName}
                onChange={(event) => {
                  setVoicePreviewEnabled(event.target.checked);
                  if (!event.target.checked) {
                    stopVoicePreview();
                  }
                }}
              />
              Voice sync preview
            </label>
            <input
              ref={voiceInputRef}
              className="hidden-input"
              type="file"
              accept="audio/mpeg,.mp3"
              onChange={(event) => readVoicePreviewFile(event.target.files?.[0] ?? null)}
            />
            <button className="ghost-button full" onClick={() => voiceInputRef.current?.click()}>
              <Music2 size={18} />
              {voicePreviewName ? 'Change Voice MP3' : 'Import Voice MP3'}
            </button>
            {voicePreviewName && <p className="format-note voice-file-name">{voicePreviewName}</p>}
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={audio.autoSelect}
                onChange={(event) => setAudio((current) => ({ ...current, autoSelect: event.target.checked }))}
              />
              Auto-select by scene style
            </label>
            <div className="field-row">
              <label>Audio Preset</label>
              <select
                value={audio.preset}
                disabled={audio.autoSelect}
                onChange={(event) => setAudio((current) => ({ ...current, preset: event.target.value as AudioSettings['preset'] }))}
              >
                {AUDIO_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            {activeScene && (
              <button
                className="ghost-button full"
                onClick={() => setAudio((current) => ({ ...current, preset: getSuggestedAudioPreset(activeScene), autoSelect: false }))}
              >
                <Sparkles size={18} />
                Use Best Fit: {getAudioPresetLabel(getSuggestedAudioPreset(activeScene))}
              </button>
            )}
            <button className="ghost-button full" disabled={!audio.enabled} onClick={previewAudioOnce}>
              <Play size={18} />
              Preview Audio
            </button>
            <div className="slider-grid">
              <label>
                Volume <strong>{Math.round(audio.volume * 100)}%</strong>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.volume}
                  onChange={(event) => setAudio((current) => ({ ...current, volume: Number(event.target.value) }))}
                />
              </label>
              <label>
                Intensity <strong>{Math.round(audio.intensity * 100)}%</strong>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={audio.intensity}
                  onChange={(event) => setAudio((current) => ({ ...current, intensity: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className="panel-divider" />
            <div className="panel-heading">
              <FolderOpen size={18} />
              <span>Project Files</span>
            </div>
            <input
              ref={projectInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => void importProjectFile(event.target.files?.[0] ?? null)}
            />
            <div className="project-actions">
              <button className="ghost-button" onClick={exportProjectFile}>
                <Download size={18} />
                Export JSON
              </button>
              <button className="ghost-button" onClick={() => projectInputRef.current?.click()}>
                <FolderOpen size={18} />
                Import JSON
              </button>
            </div>

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
