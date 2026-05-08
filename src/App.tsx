import { useEffect, useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Download,
  Film,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Type,
  Wand2
} from 'lucide-react';
import {
  AnimationStyle,
  AspectRatio,
  DEFAULT_TEXT,
  canvasToPng,
  estimateDuration,
  getAspectSize,
  getFrameCount,
  renderFrame
} from './renderer';
import { exportAlphaWebm, exportMp4 } from './videoExport';

type ExportKind = 'mp4' | 'webm-alpha' | 'mov-alpha';

const FF_VERSION = '0.12.10';

const styles: { id: AnimationStyle; label: string; description: string }[] = [
  { id: 'punch', label: 'Punch', description: 'Big captions with active-word impact.' },
  { id: 'cascade', label: 'Cascade', description: 'Words step into place line by line.' },
  { id: 'typewriter', label: 'Type', description: 'Fast reveal for explainers and demos.' },
  { id: 'drift', label: 'Drift', description: 'Smooth floating motion for calm edits.' }
];

const colors = ['#FF3B30', '#FFD60A', '#32D74B', '#64D2FF', '#BF5AF2', '#FF9F0A'];

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

export default function App() {
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const pausedAtRef = useRef(0);

  const [text, setText] = useState(DEFAULT_TEXT);
  const [style, setStyle] = useState<AnimationStyle>('punch');
  const [aspect, setAspect] = useState<AspectRatio>('16:9');
  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(() => estimateDuration(DEFAULT_TEXT));
  const [accent, setAccent] = useState('#FF3B30');
  const [isPlaying, setIsPlaying] = useState(true);
  const [playhead, setPlayhead] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const size = getAspectSize(aspect);
  const settings = useMemo(
    () => ({
      text,
      style,
      width: size.width,
      height: size.height,
      duration,
      fps,
      fontFamily: 'Inter, Arial, sans-serif',
      foreground: '#F4F2EA',
      accent,
      shadow: 'rgba(0, 0, 0, 0.7)'
    }),
    [accent, duration, fps, size.height, size.width, style, text]
  );

  const frameCount = getFrameCount(settings);

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
        const nextTime = ((now - startRef.current) / 1000) % duration;
        pausedAtRef.current = nextTime;
        setPlayhead(nextTime);
        renderFrame(canvas, settings, nextTime, { preview: true });
        rafRef.current = requestAnimationFrame(draw);
      } else {
        startRef.current = 0;
        renderFrame(canvas, settings, pausedAtRef.current, { preview: true });
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, isPlaying, settings]);

  useEffect(() => {
    pausedAtRef.current = Math.min(pausedAtRef.current, duration);
    const canvas = previewRef.current;
    if (canvas) {
      renderFrame(canvas, settings, pausedAtRef.current, { preview: true });
    }
  }, [duration, settings]);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setExportLabel('Loading FFmpeg.wasm');
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      if (message.includes('frame=')) {
        setExportLabel('Encoding video');
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
      setExportLabel(`Rendering frames ${frame + 1}/${frameCount}`);
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
    const output =
      kind === 'mp4' ? 'output.mp4' : kind === 'webm-alpha' ? 'output-alpha.webm' : 'output-alpha.mov';
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
      names = await writeFrames(ffmpeg, exportCanvas);
      setExportLabel('Encoding video');
      setProgress(48);

      if (kind === 'mov-alpha') {
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
      }

      setExportLabel('Preparing download');
      const data = await ffmpeg.readFile(output);
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      downloadBlob(new Blob([bytes.slice()], { type: 'video/quicktime' }), `${filePrefix()}-alpha.mov`);
      setProgress(100);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : 'Export failed. Try a shorter clip or lower FPS.');
    } finally {
      if (ffmpeg) {
        await cleanupFiles(ffmpeg, names, output);
      }
      setIsExporting(false);
      setExportLabel('');
      const canvas = previewRef.current;
      if (canvas) {
        renderFrame(canvas, settings, pausedAtRef.current, { preview: true });
      }
    }
  };

  const updateText = (value: string) => {
    setText(value);
    setDuration(estimateDuration(value));
    pausedAtRef.current = 0;
    startRef.current = 0;
  };

  const seek = (value: number) => {
    const next = Number(value);
    pausedAtRef.current = next;
    setPlayhead(next);
    setIsPlaying(false);
    const canvas = previewRef.current;
    if (canvas) {
      renderFrame(canvas, settings, next, { preview: true });
    }
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
              <p className="eyebrow">Transparent text animation</p>
              <h1>Kinetic Text Exporter</h1>
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
              <Wand2 size={18} />
              <span>Source</span>
            </div>
            <textarea
              value={text}
              onChange={(event) => updateText(event.target.value)}
              placeholder="Type the caption sequence..."
              spellCheck="true"
            />

            <div className="field-row">
              <label>Aspect</label>
              <div className="segmented">
                {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((item) => (
                  <button
                    key={item}
                    className={aspect === item ? 'active' : ''}
                    onClick={() => setAspect(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <label>Style</label>
              <div className="style-list">
                {styles.map((item) => (
                  <button
                    key={item.id}
                    className={style === item.id ? 'style-card active' : 'style-card'}
                    onClick={() => setStyle(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <label>Accent</label>
              <div className="swatches">
                {colors.map((color) => (
                  <button
                    key={color}
                    aria-label={`Use ${color}`}
                    className={accent === color ? 'swatch active' : 'swatch'}
                    style={{ backgroundColor: color }}
                    onClick={() => setAccent(color)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <section className="preview-stage">
            <div className="preview-toolbar">
              <div>
                <p className="eyebrow">Real-time preview</p>
                <strong>{getAspectSize(aspect).label}</strong>
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
              <Film size={18} />
              <span>Export</span>
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
            <div className="export-stat">
              <span>Duration</span>
              <input
                type="number"
                min="3"
                max="300"
                step="0.1"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </div>

            <button className="primary-button full" disabled={isExporting} onClick={() => exportVideo('mp4')}>
              <Download size={18} />
              Download MP4
            </button>
            <p className="format-note">
              MP4 uses WebCodecs for long exports and does not store thousands of temporary PNG frames.
              Alpha WebM uses the same long-export path with VP9 transparency.
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
