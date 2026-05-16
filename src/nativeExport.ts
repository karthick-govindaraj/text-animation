import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isDesktopApp } from './desktop';

export type NativeFfmpegAvailability = {
  available: boolean;
  source?: string | null;
  version?: string | null;
  error?: string | null;
};

export type NativeFfmpegExportRequest = {
  inputFrameDir: string;
  outputFilePath: string;
  fps: number;
  width: number;
  height: number;
  codecSettings?: {
    codec?: string;
    preset?: string;
    pixelFormat?: string;
    faststart?: boolean;
  };
};

export type NativeFfmpegExportResult = {
  success: boolean;
  command: string[];
  exitCode?: number | null;
  stdout: string;
  stderr: string;
  outputFilePath: string;
};

export type BackendSceneExportRequest = {
  outputFilePath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  scenes: {
    id: string;
    text: string;
    start: number;
    duration: number;
    accent?: string;
    offsetX?: number;
    offsetY?: number;
  }[];
};

type NativeFrameDirectory = {
  path: string;
};

function assertDesktopApp() {
  if (!isDesktopApp()) {
    throw new Error('Native FFmpeg export is only available inside the Tauri desktop app.');
  }
}

export async function checkNativeFfmpegAvailable() {
  assertDesktopApp();
  return invoke<NativeFfmpegAvailability>('check_ffmpeg_available');
}

export async function runNativeFfmpegExport(request: NativeFfmpegExportRequest) {
  assertDesktopApp();
  return invoke<NativeFfmpegExportResult>('run_ffmpeg_export', { request });
}

export async function runBackendSceneExport(request: BackendSceneExportRequest) {
  assertDesktopApp();
  return invoke<NativeFfmpegExportResult>('run_backend_scene_export', { request });
}

export async function createNativeFrameDirectory(jobId: string) {
  assertDesktopApp();
  const result = await invoke<NativeFrameDirectory>('create_native_frame_directory', { jobId });
  return result.path;
}

export async function writeNativeJpegFrame(frameDir: string, frameIndex: number, bytes: Uint8Array) {
  assertDesktopApp();
  const filename = `frame-${String(frameIndex + 1).padStart(6, '0')}.jpg`;
  await writeFile(await join(frameDir, filename), bytes);
}

export async function cleanupNativeFrameDirectory(frameDir: string | null) {
  if (!frameDir || !isDesktopApp()) {
    return;
  }

  await invoke('cleanup_native_frame_directory', { frameDir }).catch(() => undefined);
}

// ─── Production Export Job System ───

export interface ExportPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  format: string;
}

export interface ExportManifest {
  jobId: string;
  state: string;
  preset: ExportPreset;
  totalFrames: number;
  renderedFrames: number;
  outputPath: string;
  error: string | null;
}

export async function getExportPresets(): Promise<ExportPreset[]> {
  return invoke('get_export_presets');
}

export async function startNativeExport(
  project: unknown,
  cacheRoot: string,
  jobId: string,
  presetName: string,
  outputFilePath?: string,
): Promise<ExportManifest> {
  return invoke('start_native_export', { project, cacheRoot, jobId, presetName, outputFilePath });
}

export async function cleanupExportJob(
  cacheRoot: string,
  jobId: string,
): Promise<void> {
  return invoke('cleanup_export_job', { cacheRoot, jobId });
}
