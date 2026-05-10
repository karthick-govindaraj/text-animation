import { ArrayBufferTarget as Mp4ArrayBufferTarget, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmArrayBufferTarget, Muxer as WebmMuxer } from 'webm-muxer';
import { encodeAudioBuffer, renderProjectAudio } from './audio';
import type { EncodedAudioCodec } from './audio';
import { RenderSettings, getFrameCount, renderFrameAsync } from './renderer';

type ProgressCallback = (progress: number, label: string) => void;
type EncodedAudio = {
  buffer: AudioBuffer;
  codec: EncodedAudioCodec;
  chunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[];
};

const MICROSECONDS_PER_SECOND = 1_000_000;

function waitForUi() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function waitForFonts() {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
}

function getBitrate(settings: RenderSettings) {
  const pixels = settings.width * settings.height;
  const hdPixels = 1920 * 1080;
  const scale = pixels / hdPixels;
  const fpsScale = settings.fps / 30;
  return Math.round(Math.min(Math.max(18_000_000 * scale * fpsScale, 12_000_000), 72_000_000));
}

async function getSupportedConfig(configs: VideoEncoderConfig[]) {
  for (const config of configs) {
    const support = await VideoEncoder.isConfigSupported(config);
    if (support.supported && support.config) {
      return support.config;
    }
  }

  return null;
}

async function getSupportedAvcConfig(settings: RenderSettings): Promise<VideoEncoderConfig> {
  const baseConfig = {
    width: settings.width,
    height: settings.height,
    bitrate: getBitrate(settings),
    framerate: settings.fps,
    avc: { format: 'avc' as const },
    latencyMode: 'quality' as const
  };

  const candidates = [
    'avc1.640033',
    'avc1.64002A',
    'avc1.640028',
    'avc1.4D402A',
    'avc1.42E01F'
  ];
  const accelerationModes = ['prefer-hardware', 'no-preference', 'prefer-software'] as const;

  const config = await getSupportedConfig(
    accelerationModes.flatMap((hardwareAcceleration) =>
      candidates.map((codec) => ({ ...baseConfig, codec, hardwareAcceleration }))
    )
  );

  if (!config) {
    throw new Error('This browser cannot encode H.264 MP4 with WebCodecs. Use current Chrome or Edge.');
  }

  return config;
}

async function getSupportedVp9AlphaConfig(settings: RenderSettings): Promise<VideoEncoderConfig> {
  const baseConfig = {
    width: settings.width,
    height: settings.height,
    bitrate: getBitrate(settings),
    framerate: settings.fps,
    latencyMode: 'quality' as const,
    alpha: 'keep' as const
  };
  const accelerationModes = ['prefer-hardware', 'no-preference', 'prefer-software'] as const;

  const config = await getSupportedConfig(
    accelerationModes.flatMap((hardwareAcceleration) =>
      ['vp09.00.10.08', 'vp09.00.10.10', 'vp9'].map((codec) => ({ ...baseConfig, codec, hardwareAcceleration }))
    )
  );

  if (!config) {
    throw new Error('This browser cannot encode VP9 with alpha. Use current Chrome or Edge.');
  }

  return config;
}

function assertWebCodecs() {
  if (!('VideoEncoder' in window) || !('VideoFrame' in window)) {
    throw new Error('WebCodecs is not available in this browser. Use current Chrome or Edge for long exports.');
  }
}

async function encodeFrames(
  settings: RenderSettings,
  encoderConfig: VideoEncoderConfig,
  onProgress: ProgressCallback,
  onChunk: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => void,
  label: string
) {
  const frameCount = getFrameCount(settings);
  const frameDuration = Math.round(MICROSECONDS_PER_SECOND / settings.fps);
  const canvas = document.createElement('canvas');
  canvas.width = settings.width;
  canvas.height = settings.height;

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      onChunk(chunk, meta);
    },
    error: (error) => {
      encoderError = error;
    }
  });

  encoder.configure(encoderConfig);
  onProgress(1, label);

  const keyFrameInterval = Math.max(1, settings.fps * 2);
  const flushInterval = Math.max(30, settings.fps * 3);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    if (encoderError) {
      throw encoderError;
    }

    await renderFrameAsync(canvas, settings, frameIndex / settings.fps, { preview: false });
    const frame = new VideoFrame(canvas, {
      timestamp: frameIndex * frameDuration,
      duration: frameDuration
    });

    encoder.encode(frame, { keyFrame: frameIndex % keyFrameInterval === 0 });
    frame.close();

    if (frameIndex > 0 && frameIndex % flushInterval === 0) {
      await encoder.flush();
      await waitForUi();
    } else if (frameIndex % 10 === 0) {
      await waitForUi();
    }

    const progress = Math.max(1, Math.round(((frameIndex + 1) / frameCount) * 92));
    onProgress(progress, `${label} ${frameIndex + 1}/${frameCount}`);
  }

  await encoder.flush();
  encoder.close();
}

async function encodeOptionalAudio(
  settings: RenderSettings,
  codecs: EncodedAudioCodec[],
  onProgress: ProgressCallback,
  label: string
): Promise<EncodedAudio | null> {
  if (!settings.audio.enabled) {
    return null;
  }

  const buffer = await renderProjectAudio(settings).catch(() => null);
  if (!buffer) {
    return null;
  }

  for (const codec of codecs) {
    onProgress(1, `${label} (${codec.toUpperCase()})`);
    const chunks: EncodedAudio['chunks'] = [];
    try {
      await encodeAudioBuffer(buffer, codec, (chunk, meta) => chunks.push({ chunk, meta }));
      if (chunks.length > 0) {
        return { buffer, codec, chunks };
      }
    } catch (cause) {
      console.warn(`${codec.toUpperCase()} audio export skipped:`, cause);
    }
  }

  onProgress(1, 'Audio codec unavailable, exporting silent video');
  return null;
}

export async function exportMp4(settings: RenderSettings, onProgress: ProgressCallback) {
  assertWebCodecs();
  await waitForFonts();

  const encodedAudio = await encodeOptionalAudio(settings, ['aac', 'opus'], onProgress, 'Preparing MP4 audio');

  const target = new Mp4ArrayBufferTarget();
  const muxer = new Mp4Muxer({
    target,
    video: {
      codec: 'avc',
      width: settings.width,
      height: settings.height,
      frameRate: settings.fps
    },
    audio: encodedAudio
      ? {
          codec: encodedAudio.codec,
          numberOfChannels: encodedAudio.buffer.numberOfChannels,
          sampleRate: encodedAudio.buffer.sampleRate
        }
      : undefined,
    fastStart: 'fragmented'
  });

  const config = await getSupportedAvcConfig(settings);
  await encodeFrames(settings, config, onProgress, (chunk, meta) => muxer.addVideoChunk(chunk, meta), 'Encoding MP4');
  if (encodedAudio) {
    onProgress(94, `Muxing ${encodedAudio.codec.toUpperCase()} audio`);
    encodedAudio.chunks.forEach(({ chunk, meta }) => muxer.addAudioChunk(chunk, meta));
  }
  muxer.finalize();

  onProgress(98, 'Preparing MP4');
  return new Blob([target.buffer], { type: 'video/mp4' });
}

export async function exportAlphaWebm(settings: RenderSettings, onProgress: ProgressCallback) {
  assertWebCodecs();
  await waitForFonts();

  const encodedAudio = await encodeOptionalAudio(settings, ['opus'], onProgress, 'Preparing WebM audio');

  const target = new WebmArrayBufferTarget();
  const muxer = new WebmMuxer({
    target,
    video: {
      codec: 'V_VP9',
      width: settings.width,
      height: settings.height,
      frameRate: settings.fps,
      alpha: true
    },
    audio: encodedAudio
      ? {
          codec: 'A_OPUS',
          numberOfChannels: encodedAudio.buffer.numberOfChannels,
          sampleRate: encodedAudio.buffer.sampleRate
        }
      : undefined
  });

  const config = await getSupportedVp9AlphaConfig(settings);
  await encodeFrames(
    settings,
    config,
    onProgress,
    (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    'Encoding alpha WebM'
  );
  if (encodedAudio) {
    onProgress(94, 'Muxing Opus audio');
    encodedAudio.chunks.forEach(({ chunk, meta }) => muxer.addAudioChunk(chunk, meta));
  }
  muxer.finalize();

  onProgress(98, 'Preparing alpha WebM');
  return new Blob([target.buffer], { type: 'video/webm' });
}
