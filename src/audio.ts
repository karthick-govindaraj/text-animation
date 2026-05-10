import { Howl } from 'howler';
import {
  AudioPresetId,
  AudioSettings,
  CaptionScene,
  DEFAULT_AUDIO,
  RenderSettings,
  normalizeText
} from './renderer';

export const AUDIO_SAMPLE_RATE = 48_000;

export const AUDIO_PRESETS: { id: AudioPresetId; label: string; kind: 'effect' | 'beat' | 'ambience' }[] = [
  { id: 'cinematic-boom', label: 'Cinematic Boom', kind: 'effect' },
  { id: 'bass-hit', label: 'Bass Hit', kind: 'effect' },
  { id: 'whoosh', label: 'Whoosh', kind: 'effect' },
  { id: 'impact-hit', label: 'Impact Hit', kind: 'effect' },
  { id: 'glitch-fx', label: 'Glitch FX', kind: 'effect' },
  { id: 'rise-sweep', label: 'Rise Sweep', kind: 'effect' },
  { id: 'sub-drop', label: 'Sub Drop', kind: 'effect' },
  { id: 'tick-clock-fx', label: 'Tick / Clock FX', kind: 'effect' },
  { id: 'reverse-cymbal', label: 'Reverse Cymbal', kind: 'effect' },
  { id: 'trailer-braam', label: 'Trailer Braam', kind: 'effect' },
  { id: 'ui-click-sounds', label: 'UI Click Sounds', kind: 'effect' },
  { id: 'typewriter-fx', label: 'Typewriter FX', kind: 'effect' },
  { id: 'echo-hit', label: 'Echo Hit', kind: 'effect' },
  { id: 'pulse-bass', label: 'Pulse Bass', kind: 'beat' },
  { id: 'trap-beat', label: 'Trap Beat', kind: 'beat' },
  { id: 'phonk-beat', label: 'Phonk Beat', kind: 'beat' },
  { id: 'synthwave-beat', label: 'Synthwave Beat', kind: 'beat' },
  { id: 'cyberpunk-ambience', label: 'Cyberpunk Ambience', kind: 'ambience' },
  { id: 'epic-trailer-music', label: 'Epic Trailer Music', kind: 'beat' },
  { id: 'lo-fi-beat', label: 'Lo-fi Beat', kind: 'beat' },
  { id: 'glitch-bass', label: 'Glitch Bass', kind: 'beat' },
  { id: 'percussion-hits', label: 'Percussion Hits', kind: 'beat' },
  { id: 'stomp-beat', label: 'Stomp Beat', kind: 'beat' },
  { id: 'hybrid-orchestral-beat', label: 'Hybrid Orchestral Beat', kind: 'beat' },
  { id: 'edm-build-up', label: 'EDM Build-up', kind: 'beat' },
  { id: 'heartbeat-fx', label: 'Heartbeat FX', kind: 'effect' },
  { id: 'vinyl-scratch', label: 'Vinyl Scratch', kind: 'effect' },
  { id: 'digital-beep-fx', label: 'Digital Beep FX', kind: 'effect' },
  { id: 'neon-hum-ambience', label: 'Neon Hum Ambience', kind: 'ambience' },
  { id: 'vocal-chop-beat', label: 'Vocal Chop Beat', kind: 'beat' }
];

export type EncodedAudioCodec = 'aac' | 'opus';
type AudioChunkCallback = (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void;
type SoundKey =
  | 'bassDrop'
  | 'bassHit'
  | 'cinematicBoom1'
  | 'cinematicBoom2'
  | 'glitch'
  | 'impactHit1'
  | 'impactHit2'
  | 'impactHit3'
  | 'reverseCymbal'
  | 'subDrop'
  | 'tick'
  | 'typewriter'
  | 'uiClick1'
  | 'uiClick2'
  | 'uiClick3'
  | 'whoosh1'
  | 'whoosh2'
  | 'whoosh3';

type PreviewAudioEvent = {
  time: number;
  preset: AudioPresetId;
  index: number;
};

const beatPresets = new Set<AudioPresetId>([
  'pulse-bass',
  'trap-beat',
  'phonk-beat',
  'synthwave-beat',
  'epic-trailer-music',
  'lo-fi-beat',
  'glitch-bass',
  'percussion-hits',
  'stomp-beat',
  'hybrid-orchestral-beat',
  'edm-build-up',
  'vocal-chop-beat'
]);

const ambiencePresets = new Set<AudioPresetId>(['cyberpunk-ambience', 'neon-hum-ambience']);

const SOUND_URLS: Record<SoundKey, string> = {
  bassDrop: new URL('../sound-effects/Bass-Drop.mp3', import.meta.url).href,
  bassHit: new URL('../sound-effects/Bass-Hit.mp3', import.meta.url).href,
  cinematicBoom1: new URL('../sound-effects/Cinematic-Boom-1.mp3', import.meta.url).href,
  cinematicBoom2: new URL('../sound-effects/Cinematic-Boom-2.mp3', import.meta.url).href,
  glitch: new URL('../sound-effects/Glitch.mp3', import.meta.url).href,
  impactHit1: new URL('../sound-effects/Impact-Hit-1.mp3', import.meta.url).href,
  impactHit2: new URL('../sound-effects/Impact-Hit-2.mp3', import.meta.url).href,
  impactHit3: new URL('../sound-effects/Impact-Hit-3.mp3', import.meta.url).href,
  reverseCymbal: new URL('../sound-effects/Reverse-Cymbal.mp3', import.meta.url).href,
  subDrop: new URL('../sound-effects/Sub-Drop.mp3', import.meta.url).href,
  tick: new URL('../sound-effects/Tick.mp3', import.meta.url).href,
  typewriter: new URL('../sound-effects/Typewriter.mp3', import.meta.url).href,
  uiClick1: new URL('../sound-effects/UI-Click-1.mp3', import.meta.url).href,
  uiClick2: new URL('../sound-effects/UI-Click-2.mp3', import.meta.url).href,
  uiClick3: new URL('../sound-effects/UI-Click-3.mp3', import.meta.url).href,
  whoosh1: new URL('../sound-effects/Whoosh-1.mp3', import.meta.url).href,
  whoosh2: new URL('../sound-effects/Whoosh-2.mp3', import.meta.url).href,
  whoosh3: new URL('../sound-effects/Whoosh-3.mp3', import.meta.url).href
};

const PRESET_SOUNDS: Record<AudioPresetId, SoundKey[]> = {
  'cinematic-boom': ['cinematicBoom1', 'cinematicBoom2'],
  'bass-hit': ['bassHit'],
  whoosh: ['whoosh1', 'whoosh2', 'whoosh3'],
  'impact-hit': ['impactHit1', 'impactHit2', 'impactHit3'],
  'glitch-fx': ['glitch'],
  'rise-sweep': ['whoosh2', 'reverseCymbal'],
  'sub-drop': ['subDrop', 'bassDrop'],
  'tick-clock-fx': ['tick'],
  'reverse-cymbal': ['reverseCymbal'],
  'trailer-braam': ['cinematicBoom2', 'subDrop'],
  'ui-click-sounds': ['uiClick1', 'uiClick2', 'uiClick3'],
  'typewriter-fx': ['typewriter'],
  'echo-hit': ['impactHit2', 'whoosh1'],
  'pulse-bass': ['bassHit', 'tick'],
  'trap-beat': ['bassHit', 'uiClick1', 'uiClick2'],
  'phonk-beat': ['bassDrop', 'bassHit'],
  'synthwave-beat': ['bassHit', 'whoosh3'],
  'cyberpunk-ambience': ['glitch', 'uiClick3'],
  'epic-trailer-music': ['cinematicBoom1', 'impactHit3'],
  'lo-fi-beat': ['tick', 'uiClick2'],
  'glitch-bass': ['glitch', 'bassDrop'],
  'percussion-hits': ['impactHit1', 'uiClick1'],
  'stomp-beat': ['impactHit3', 'bassHit'],
  'hybrid-orchestral-beat': ['cinematicBoom1', 'impactHit2'],
  'edm-build-up': ['reverseCymbal', 'whoosh2'],
  'heartbeat-fx': ['bassHit'],
  'vinyl-scratch': ['glitch', 'whoosh1'],
  'digital-beep-fx': ['uiClick2', 'uiClick3'],
  'neon-hum-ambience': ['whoosh3', 'uiClick3'],
  'vocal-chop-beat': ['uiClick1', 'glitch']
};

const previewHowls = new Map<SoundKey, Howl>();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function safeAudio(settings: RenderSettings): AudioSettings {
  return { ...DEFAULT_AUDIO, ...(settings.audio ?? {}) };
}

function getPreviewHowl(soundKey: SoundKey) {
  let howl = previewHowls.get(soundKey);
  if (!howl) {
    howl = new Howl({
      src: [SOUND_URLS[soundKey]],
      html5: false,
      preload: true
    });
    previewHowls.set(soundKey, howl);
  }
  return howl;
}

function pickSound(preset: AudioPresetId, index: number) {
  const sounds = PRESET_SOUNDS[preset] ?? PRESET_SOUNDS.whoosh;
  return sounds[index % sounds.length];
}

function playPresetSound(preset: AudioPresetId, audio: AudioSettings, index: number) {
  const howl = getPreviewHowl(pickSound(preset, index));
  const id = howl.play();
  const volume = clamp(audio.volume * (0.45 + audio.intensity * 0.65), 0, 1);
  howl.volume(volume, id);
  if (preset === 'tick-clock-fx' || preset === 'typewriter-fx' || preset === 'ui-click-sounds') {
    howl.rate(0.92 + (index % 5) * 0.04, id);
  } else if (preset === 'glitch-fx' || preset === 'glitch-bass') {
    howl.rate(0.9 + (index % 4) * 0.08, id);
  } else {
    howl.rate(1, id);
  }
}

function stopPreviewSounds() {
  previewHowls.forEach((howl) => howl.stop());
}

function buildPreviewAudioEvents(settings: RenderSettings) {
  const audio = safeAudio(settings);
  const events: PreviewAudioEvent[] = [];
  let cursor = 0;

  settings.scenes.forEach((scene) => {
    const words = normalizeText(scene.text).split(' ').filter(Boolean);
    const preset = audio.autoSelect ? getSuggestedAudioPreset(scene) : audio.preset;
    const activeWordCount = clamp(Math.round(scene.activeWordCount || 1), 1, 8);

    if (words.length > 0) {
      const readableDuration = Math.max(0.6, scene.duration * 0.84);
      const step = readableDuration / Math.max(1, words.length);
      const groupCount = Math.ceil(words.length / activeWordCount);

      for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const eventTime = Math.min(
          cursor + scene.duration - 0.04,
          cursor + 0.16 + groupIndex * step * activeWordCount
        );
        events.push({ time: eventTime, preset, index: events.length });
      }
    } else {
      events.push({ time: cursor, preset, index: events.length });
    }

    cursor += scene.duration;
  });

  return events.sort((a, b) => a.time - b.time);
}

export function playPreviewAudioHit(settings: RenderSettings, atTime = 0) {
  const audio = safeAudio(settings);
  if (!audio.enabled || settings.duration <= 0) {
    return;
  }

  const events = buildPreviewAudioEvents(settings);
  const time = clamp(atTime, 0, Math.max(0, settings.duration - 0.001));
  const event = events.find((item) => item.time >= time) ?? events[0];
  if (event) {
    playPresetSound(event.preset, audio, event.index);
  }
}

export function startHowlerPreviewAudio(settings: RenderSettings, getTime: () => number) {
  const audio = safeAudio(settings);
  if (!audio.enabled || settings.duration <= 0) {
    return () => undefined;
  }

  const events = buildPreviewAudioEvents(settings);
  let frameId = 0;
  let lastTime = clamp(getTime(), 0, Math.max(0, settings.duration - 0.001));
  let loopIndex = 0;
  const played = new Set<string>();

  const playRange = (from: number, to: number) => {
    events.forEach((event) => {
      const key = `${loopIndex}:${event.index}`;
      if (!played.has(key) && event.time > from && event.time <= to) {
        played.add(key);
        playPresetSound(event.preset, audio, event.index);
      }
    });
  };

  const tick = () => {
    const currentTime = clamp(getTime(), 0, Math.max(0, settings.duration - 0.001));
    if (currentTime + 0.08 < lastTime) {
      playRange(lastTime, settings.duration);
      loopIndex += 1;
      played.clear();
      playRange(0, currentTime);
    } else {
      playRange(lastTime, currentTime);
    }
    lastTime = currentTime;
    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frameId);
    stopPreviewSounds();
  };
}

export function getAudioPresetLabel(id: AudioPresetId) {
  return AUDIO_PRESETS.find((preset) => preset.id === id)?.label ?? id;
}

export function getSuggestedAudioPreset(scene: CaptionScene): AudioPresetId {
  const typography = scene.typographyStyle;
  const animation = scene.animationStyle;

  if (typography === 'cinematic' || animation === 'luxury-title') {
    return 'cinematic-boom';
  }
  if (typography === 'glitch-typography' || typography === 'ai-cyberpunk' || animation === 'glitch') {
    return 'glitch-fx';
  }
  if (animation === 'typewriter' || typography === 'handwritten') {
    return 'typewriter-fx';
  }
  if (animation === 'stomp' || typography === 'explosive') {
    return 'stomp-beat';
  }
  if (typography === 'neon' || animation === 'neon-flicker') {
    return 'neon-hum-ambience';
  }
  if (typography === 'ui-tech' || animation === 'tech-hud') {
    return 'ui-click-sounds';
  }
  if (animation === 'karaoke' || typography === 'sync') {
    return 'pulse-bass';
  }
  if (animation === 'news-ticker' || typography === 'scroll-based') {
    return 'tick-clock-fx';
  }
  return 'whoosh';
}

function addTone(
  ctx: BaseAudioContext,
  destination: AudioNode,
  start: number,
  duration: number,
  fromFreq: number,
  toFreq: number,
  gainValue: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), start + Math.max(0.02, duration));
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + Math.min(0.04, duration * 0.35));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function addNoise(
  ctx: BaseAudioContext,
  destination: AudioNode,
  start: number,
  duration: number,
  gainValue: number,
  filterType: BiquadFilterType,
  frequency: number
) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + Math.min(0.03, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(destination);
  source.start(start);
}

function addClick(ctx: BaseAudioContext, destination: AudioNode, start: number, gainValue: number, high = 1800) {
  addTone(ctx, destination, start, 0.045, high, high * 0.6, gainValue, 'square');
  addNoise(ctx, destination, start, 0.035, gainValue * 0.35, 'highpass', 2600);
}

function scheduleEffect(
  ctx: BaseAudioContext,
  destination: AudioNode,
  preset: AudioPresetId,
  start: number,
  volume: number,
  intensity: number
) {
  const g = volume * (0.35 + intensity * 0.75);
  switch (preset) {
    case 'cinematic-boom':
      addTone(ctx, destination, start, 1.25, 92, 34, g * 0.72, 'sine');
      addNoise(ctx, destination, start, 0.52, g * 0.18, 'lowpass', 420);
      break;
    case 'bass-hit':
      addTone(ctx, destination, start, 0.58, 110, 42, g * 0.8, 'sine');
      break;
    case 'impact-hit':
      addTone(ctx, destination, start, 0.42, 150, 48, g * 0.72, 'triangle');
      addNoise(ctx, destination, start, 0.18, g * 0.34, 'bandpass', 900);
      break;
    case 'glitch-fx':
      for (let i = 0; i < 6; i += 1) {
        addClick(ctx, destination, start + i * 0.045, g * 0.2, 600 + i * 520);
      }
      break;
    case 'rise-sweep':
    case 'reverse-cymbal':
    case 'whoosh':
      addNoise(ctx, destination, start, preset === 'whoosh' ? 0.55 : 1.15, g * 0.22, 'highpass', preset === 'whoosh' ? 900 : 1500);
      addTone(ctx, destination, start, preset === 'whoosh' ? 0.55 : 1.15, 180, preset === 'whoosh' ? 840 : 2200, g * 0.14, 'sawtooth');
      break;
    case 'sub-drop':
      addTone(ctx, destination, start, 1.1, 90, 24, g * 0.75, 'sine');
      break;
    case 'tick-clock-fx':
    case 'ui-click-sounds':
    case 'digital-beep-fx':
      addClick(ctx, destination, start, g * 0.28, preset === 'digital-beep-fx' ? 2400 : 1600);
      break;
    case 'typewriter-fx':
      addClick(ctx, destination, start, g * 0.24, 1300 + Math.random() * 600);
      break;
    case 'trailer-braam':
      addTone(ctx, destination, start, 1.4, 55, 48, g * 0.42, 'sawtooth');
      addTone(ctx, destination, start, 1.4, 82, 70, g * 0.26, 'square');
      break;
    case 'echo-hit':
      addTone(ctx, destination, start, 0.34, 420, 180, g * 0.32, 'triangle');
      addTone(ctx, destination, start + 0.18, 0.34, 420, 180, g * 0.18, 'triangle');
      break;
    case 'heartbeat-fx':
      addTone(ctx, destination, start, 0.2, 96, 48, g * 0.6, 'sine');
      addTone(ctx, destination, start + 0.28, 0.24, 88, 42, g * 0.48, 'sine');
      break;
    case 'vinyl-scratch':
      addNoise(ctx, destination, start, 0.45, g * 0.22, 'bandpass', 1800);
      addTone(ctx, destination, start, 0.32, 900, 260, g * 0.18, 'sawtooth');
      break;
    default:
      addTone(ctx, destination, start, 0.45, 120, 55, g * 0.52, 'sine');
      break;
  }
}

function scheduleWordAccent(
  ctx: BaseAudioContext,
  destination: AudioNode,
  preset: AudioPresetId,
  start: number,
  volume: number,
  intensity: number,
  index: number
) {
  const g = volume * (0.18 + intensity * 0.34);
  switch (preset) {
    case 'typewriter-fx':
    case 'ui-click-sounds':
    case 'digital-beep-fx':
      addClick(ctx, destination, start, g * 0.8, 1200 + (index % 5) * 260);
      break;
    case 'glitch-fx':
    case 'glitch-bass':
      addClick(ctx, destination, start, g * 0.58, 700 + (index % 6) * 520);
      addNoise(ctx, destination, start, 0.045, g * 0.18, 'bandpass', 1800 + (index % 4) * 640);
      break;
    case 'stomp-beat':
    case 'impact-hit':
      addTone(ctx, destination, start, 0.13, 118, 56, g * 0.78, 'sine');
      addNoise(ctx, destination, start, 0.055, g * 0.2, 'lowpass', 760);
      break;
    case 'cinematic-boom':
    case 'trailer-braam':
      addTone(ctx, destination, start, 0.18, 150, 68, g * 0.45, 'triangle');
      break;
    case 'sub-drop':
    case 'bass-hit':
    case 'pulse-bass':
      addTone(ctx, destination, start, 0.16, 112, 48, g * 0.68, 'sine');
      break;
    case 'neon-hum-ambience':
    case 'cyberpunk-ambience':
      addTone(ctx, destination, start, 0.09, 880 + (index % 3) * 140, 520, g * 0.28, 'sine');
      break;
    case 'tick-clock-fx':
      addClick(ctx, destination, start, g * 0.62, 1700);
      break;
    case 'whoosh':
    case 'rise-sweep':
    case 'reverse-cymbal':
      addNoise(ctx, destination, start, 0.12, g * 0.14, 'highpass', 1600);
      addTone(ctx, destination, start, 0.11, 320, 860, g * 0.12, 'sawtooth');
      break;
    case 'vinyl-scratch':
      addNoise(ctx, destination, start, 0.075, g * 0.18, 'bandpass', 1900);
      break;
    default:
      addClick(ctx, destination, start, g * 0.42, 1100 + (index % 4) * 180);
      addTone(ctx, destination, start, 0.08, 260 + (index % 5) * 50, 130, g * 0.2, 'triangle');
      break;
  }
}

function scheduleWordAccents(
  ctx: BaseAudioContext,
  destination: AudioNode,
  scene: CaptionScene,
  preset: AudioPresetId,
  sceneStart: number,
  volume: number,
  intensity: number
) {
  const words = normalizeText(scene.text).split(' ').filter(Boolean);
  if (words.length === 0) {
    return;
  }

  const readableDuration = Math.max(0.6, scene.duration * 0.84);
  const step = readableDuration / Math.max(1, words.length);
  const activeWordCount = clamp(Math.round(scene.activeWordCount || 1), 1, 8);
  words.forEach((_, index) => {
    const groupIndex = Math.floor(index / activeWordCount);
    const groupStart = sceneStart + 0.16 + groupIndex * step * activeWordCount;
    const groupedOffset = (index % activeWordCount) * Math.min(0.055, step * 0.32);
    const wordTime = Math.min(sceneStart + scene.duration - 0.06, groupStart + groupedOffset);
    scheduleWordAccent(ctx, destination, preset, wordTime, volume, intensity, index);
  });
}

function scheduleBeat(ctx: BaseAudioContext, destination: AudioNode, preset: AudioPresetId, start: number, end: number, volume: number, intensity: number) {
  const bpm =
    preset === 'trap-beat' || preset === 'edm-build-up'
      ? 140
      : preset === 'phonk-beat'
        ? 128
        : preset === 'lo-fi-beat'
          ? 82
          : preset === 'synthwave-beat'
            ? 108
            : 96;
  const step = 60 / bpm;
  let index = 0;
  for (let t = start; t < end; t += step) {
    const strong = index % 4 === 0;
    if (strong || preset !== 'pulse-bass') {
      addTone(ctx, destination, t, strong ? 0.32 : 0.14, strong ? 86 : 190, strong ? 42 : 110, volume * (strong ? 0.55 : 0.18) * intensity, strong ? 'sine' : 'triangle');
    }
    if ((preset === 'trap-beat' || preset === 'phonk-beat' || preset === 'percussion-hits') && index % 2 === 1) {
      addNoise(ctx, destination, t, 0.08, volume * 0.14 * intensity, 'highpass', 3000);
    }
    if (preset === 'stomp-beat' && index % 2 === 0) {
      scheduleEffect(ctx, destination, 'impact-hit', t, volume * 0.75, intensity);
    }
    if (preset === 'vocal-chop-beat' && index % 3 === 0) {
      addTone(ctx, destination, t, 0.18, 520, 390, volume * 0.16 * intensity, 'square');
    }
    if (preset === 'glitch-bass' && index % 3 === 1) {
      scheduleEffect(ctx, destination, 'glitch-fx', t, volume * 0.7, intensity);
    }
    index += 1;
  }
}

function scheduleAmbience(ctx: BaseAudioContext, destination: AudioNode, preset: AudioPresetId, duration: number, volume: number, intensity: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = preset === 'neon-hum-ambience' ? 'sine' : 'sawtooth';
  osc.frequency.value = preset === 'neon-hum-ambience' ? 58 : 96;
  filter.type = 'lowpass';
  filter.frequency.value = preset === 'neon-hum-ambience' ? 620 : 980;
  gain.gain.setValueAtTime(volume * 0.05 * intensity, 0);
  osc.connect(filter).connect(gain).connect(destination);
  osc.start(0);
  osc.stop(duration);
}

export async function renderProjectAudio(settings: RenderSettings) {
  const audio = safeAudio(settings);
  if (!audio.enabled || settings.duration <= 0) {
    return null;
  }

  const sampleRate = AUDIO_SAMPLE_RATE;
  const frameCount = Math.ceil(settings.duration * sampleRate);
  const offline = new OfflineAudioContext(2, frameCount, sampleRate);
  const master = offline.createGain();
  master.gain.value = 1;
  master.connect(offline.destination);

  let cursor = 0;
  for (const scene of settings.scenes) {
    const preset = audio.autoSelect ? getSuggestedAudioPreset(scene) : audio.preset;
    const sceneEnd = cursor + scene.duration;
    if (ambiencePresets.has(preset)) {
      scheduleAmbience(offline, master, preset, settings.duration, audio.volume, audio.intensity);
    } else if (beatPresets.has(preset)) {
      scheduleBeat(offline, master, preset, cursor, sceneEnd, audio.volume, audio.intensity);
    } else {
      scheduleEffect(offline, master, preset, cursor, audio.volume, audio.intensity);
    }
    scheduleWordAccents(offline, master, scene, preset, cursor, audio.volume, audio.intensity);
    cursor = sceneEnd;
  }

  return offline.startRendering();
}

export function audioBufferToWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, channels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString('data');
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < length; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = clamp(buffer.getChannelData(channel)[i], -1, 1);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function getAudioEncoderConfig(codec: string, buffer: AudioBuffer): Promise<AudioEncoderConfig | null> {
  if (!('AudioEncoder' in window) || !('AudioData' in window)) {
    return null;
  }

  const base = {
    codec,
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
    bitrate: codec === 'opus' ? 128_000 : 192_000
  };
  const support = await AudioEncoder.isConfigSupported(base);
  return support.supported && support.config ? support.config : null;
}

export async function encodeAudioBuffer(
  buffer: AudioBuffer,
  codec: EncodedAudioCodec,
  onChunk: AudioChunkCallback
) {
  const encoderConfig = await getAudioEncoderConfig(codec === 'aac' ? 'mp4a.40.2' : 'opus', buffer);
  if (!encoderConfig) {
    throw new Error('AudioEncoder is not available for this audio codec.');
  }

  let encoderError: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => onChunk(chunk, meta),
    error: (error) => {
      encoderError = error;
    }
  });
  encoder.configure(encoderConfig);

  const chunkFrames = codec === 'aac' ? 1024 : 960;
  for (let frame = 0; frame < buffer.length; frame += chunkFrames) {
    if (encoderError) {
      throw encoderError;
    }

    const frames = Math.min(chunkFrames, buffer.length - frame);
    const planar = new Float32Array(frames * buffer.numberOfChannels);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      planar.set(buffer.getChannelData(channel).subarray(frame, frame + frames), channel * frames);
    }

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate: buffer.sampleRate,
      numberOfFrames: frames,
      numberOfChannels: buffer.numberOfChannels,
      timestamp: Math.round((frame / buffer.sampleRate) * 1_000_000),
      data: planar
    });
    encoder.encode(audioData);
    audioData.close();
  }

  await encoder.flush();
  encoder.close();
}
