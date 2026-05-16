use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

const DEFAULT_FRAME_PATTERN: &str = "frame-%06d.jpg";
const DEFAULT_VIDEO_CODEC: &str = "libx264";
const DEFAULT_PIXEL_FORMAT: &str = "yuv420p";
const DEFAULT_PRESET: &str = "medium";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegAvailability {
  pub available: bool,
  pub source: Option<String>,
  pub version: Option<String>,
  pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCodecSettings {
  pub codec: Option<String>,
  pub preset: Option<String>,
  pub pixel_format: Option<String>,
  pub faststart: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFfmpegExportRequest {
  pub input_frame_dir: String,
  pub output_file_path: String,
  pub fps: u32,
  pub width: u32,
  pub height: u32,
  pub codec_settings: Option<NativeCodecSettings>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFrameDirectory {
  pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegExportResult {
  pub success: bool,
  pub command: Vec<String>,
  pub exit_code: Option<i32>,
  pub stdout: String,
  pub stderr: String,
  pub output_file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendSceneExportRequest {
  pub output_file_path: String,
  pub width: u32,
  pub height: u32,
  pub fps: u32,
  pub duration: f64,
  pub background_color: Option<String>,
  pub font_family: Option<String>,
  pub font_size: Option<u32>,
  pub font_color: Option<String>,
  pub scenes: Vec<BackendScene>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendScene {
  pub id: String,
  pub text: String,
  pub start: f64,
  pub duration: f64,
  pub accent: Option<String>,
  pub offset_x: Option<f64>,
  pub offset_y: Option<f64>,
}

fn ffmpeg_binary() -> &'static str {
  "ffmpeg"
}

fn frame_name(frame_index: u32) -> String {
  format!("frame-{:06}.jpg", frame_index + 1)
}

fn safe_job_id(job_id: &str) -> String {
  job_id
    .chars()
    .map(|value| if value.is_ascii_alphanumeric() || value == '-' || value == '_' { value } else { '-' })
    .collect()
}

fn first_line(value: &str) -> Option<String> {
  value
    .lines()
    .find(|line| !line.trim().is_empty())
    .map(|line| line.trim().to_string())
}

fn normalize_hex_color(value: Option<&str>, fallback: &str) -> String {
  let raw = value.unwrap_or(fallback).trim();
  let without_hash = raw.strip_prefix('#').unwrap_or(raw);
  if without_hash.len() == 6 && without_hash.chars().all(|item| item.is_ascii_hexdigit()) {
    format!("0x{}", without_hash)
  } else {
    fallback.to_string()
  }
}

fn escape_filter_path(path: &Path) -> String {
  path
    .to_string_lossy()
    .replace('\\', "\\\\")
    .replace(':', "\\:")
    .replace('\'', "\\'")
}

fn wrap_scene_text(text: &str) -> String {
  let words: Vec<&str> = text.split_whitespace().collect();
  if words.is_empty() {
    return String::new();
  }

  let mut lines = Vec::new();
  let mut current = Vec::new();
  for word in words {
    current.push(word);
    if current.len() >= 5 {
      lines.push(current.join(" "));
      current.clear();
    }
  }

  if !current.is_empty() {
    lines.push(current.join(" "));
  }

  lines.join("\n")
}

fn validate_backend_scene_export_request(request: &BackendSceneExportRequest) -> Result<(), String> {
  if request.fps == 0 {
    return Err("FPS must be greater than 0.".into());
  }

  if request.width == 0 || request.height == 0 {
    return Err("Export width and height must be greater than 0.".into());
  }

  if request.duration <= 0.0 || !request.duration.is_finite() {
    return Err("Export duration must be greater than 0.".into());
  }

  if request.scenes.is_empty() {
    return Err("Export requires at least one scene.".into());
  }

  let output_path = Path::new(&request.output_file_path);
  let output_parent = output_path
    .parent()
    .filter(|parent| !parent.as_os_str().is_empty())
    .ok_or_else(|| "Output file path must include a parent directory.".to_string())?;

  if !output_parent.is_dir() {
    return Err("Output directory does not exist.".into());
  }

  Ok(())
}

fn build_backend_filter(request: &BackendSceneExportRequest, scene_text_paths: &[PathBuf]) -> String {
  let base_font_size = request.font_size.unwrap_or_else(|| (request.width.min(request.height) as f64 * 0.085).round() as u32);
  let font_color = normalize_hex_color(request.font_color.as_deref(), "0xF4F2EA");
  let font_family = request
    .font_family
    .as_deref()
    .unwrap_or("Bebas Neue")
    .split(',')
    .next()
    .unwrap_or("Bebas Neue")
    .trim()
    .replace('\'', "");

  request
    .scenes
    .iter()
    .zip(scene_text_paths.iter())
    .map(|(scene, text_path)| {
      let start = scene.start.max(0.0);
      let end = (scene.start + scene.duration.max(0.1)).min(request.duration);
      let accent = normalize_hex_color(scene.accent.as_deref(), "0xFACC15");
      let offset_x = scene.offset_x.unwrap_or(0.0).clamp(-40.0, 40.0);
      let offset_y = scene.offset_y.unwrap_or(0.0).clamp(-40.0, 40.0);
      let x = format!("(w-text_w)/2+({offset_x}/100*w)");
      let y = format!("(h-text_h)/2+({offset_y}/100*h)");
      let border_width = (base_font_size as f64 * 0.055).max(2.0).round() as u32;
      let shadow_x = (base_font_size as f64 * 0.05).max(2.0).round() as u32;
      let shadow_y = (base_font_size as f64 * 0.06).max(2.0).round() as u32;
      format!(
        "drawtext=font='{}':textfile='{}':fontcolor={}:fontsize={}:line_spacing={}:x={}:y={}:borderw={}:bordercolor={}:shadowx={}:shadowy={}:shadowcolor=0x000000AA:enable='between(t,{:.3},{:.3})'",
        font_family,
        escape_filter_path(text_path),
        font_color,
        base_font_size,
        (base_font_size as f64 * 0.18).round() as u32,
        x,
        y,
        border_width,
        accent,
        shadow_x,
        shadow_y,
        start,
        end
      )
    })
    .collect::<Vec<_>>()
    .join(",")
}

fn validate_export_request(request: &NativeFfmpegExportRequest) -> Result<(), String> {
  if request.fps == 0 {
    return Err("FPS must be greater than 0.".into());
  }

  if request.width == 0 || request.height == 0 {
    return Err("Export width and height must be greater than 0.".into());
  }

  let frame_dir = Path::new(&request.input_frame_dir);
  if !frame_dir.is_dir() {
    return Err("Input frame directory does not exist.".into());
  }

  let output_path = Path::new(&request.output_file_path);
  let output_parent = output_path
    .parent()
    .filter(|parent| !parent.as_os_str().is_empty())
    .ok_or_else(|| "Output file path must include a parent directory.".to_string())?;

  if !output_parent.is_dir() {
    return Err("Output directory does not exist.".into());
  }

  Ok(())
}

fn build_export_args(request: &NativeFfmpegExportRequest) -> Vec<String> {
  let codec_settings = request.codec_settings.as_ref();
  let codec = codec_settings
    .and_then(|settings| settings.codec.as_deref())
    .unwrap_or(DEFAULT_VIDEO_CODEC);
  let preset = codec_settings
    .and_then(|settings| settings.preset.as_deref())
    .unwrap_or(DEFAULT_PRESET);
  let pixel_format = codec_settings
    .and_then(|settings| settings.pixel_format.as_deref())
    .unwrap_or(DEFAULT_PIXEL_FORMAT);
  let faststart = codec_settings
    .and_then(|settings| settings.faststart)
    .unwrap_or(true);
  let input_pattern = PathBuf::from(&request.input_frame_dir).join(DEFAULT_FRAME_PATTERN);

  let mut args = vec![
    "-y".to_string(),
    "-framerate".to_string(),
    request.fps.to_string(),
    "-i".to_string(),
    input_pattern.to_string_lossy().into_owned(),
    "-s".to_string(),
    format!("{}x{}", request.width, request.height),
    "-c:v".to_string(),
    codec.to_string(),
    "-preset".to_string(),
    preset.to_string(),
    "-pix_fmt".to_string(),
    pixel_format.to_string(),
  ];

  if faststart {
    args.push("-movflags".to_string());
    args.push("+faststart".to_string());
  }

  args.push(request.output_file_path.clone());
  args
}

#[tauri::command]
pub fn check_ffmpeg_available() -> Result<FfmpegAvailability, String> {
  let output = Command::new(ffmpeg_binary())
    .arg("-version")
    .output()
    .map_err(|error| error.to_string())?;

  if output.status.success() {
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(FfmpegAvailability {
      available: true,
      source: Some("system-path".into()),
      version: first_line(&stdout),
      error: None,
    })
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(FfmpegAvailability {
      available: false,
      source: Some("system-path".into()),
      version: None,
      error: first_line(&stderr).or_else(|| Some("FFmpeg returned a non-zero exit status.".into())),
    })
  }
}

#[tauri::command]
pub fn create_native_frame_directory(app: tauri::AppHandle, job_id: String) -> Result<NativeFrameDirectory, String> {
  let cache_dir = app
    .path()
    .app_cache_dir()
    .map_err(|error| format!("Unable to resolve app cache directory: {error}"))?;
  let frame_dir = cache_dir.join("native-exports").join(safe_job_id(&job_id));
  fs::create_dir_all(&frame_dir).map_err(|error| format!("Unable to create native frame directory: {error}"))?;

  Ok(NativeFrameDirectory {
    path: frame_dir.to_string_lossy().into_owned(),
  })
}

#[tauri::command]
pub fn write_native_jpeg_frame(frame_dir: String, frame_index: u32, bytes: Vec<u8>) -> Result<(), String> {
  let frame_dir = PathBuf::from(frame_dir);
  if !frame_dir.is_dir() {
    return Err("Native frame directory does not exist.".into());
  }

  let frame_path = frame_dir.join(frame_name(frame_index));
  fs::write(frame_path, bytes).map_err(|error| format!("Unable to write native JPEG frame: {error}"))
}

#[tauri::command]
pub fn cleanup_native_frame_directory(frame_dir: String) -> Result<(), String> {
  let frame_dir = PathBuf::from(frame_dir);
  if !frame_dir.exists() {
    return Ok(());
  }

  fs::remove_dir_all(frame_dir).map_err(|error| format!("Unable to clean native frame directory: {error}"))
}

#[tauri::command]
pub fn run_ffmpeg_export(request: NativeFfmpegExportRequest) -> Result<FfmpegExportResult, String> {
  validate_export_request(&request)?;
  let args = build_export_args(&request);

  let output = Command::new(ffmpeg_binary())
    .args(&args)
    .output()
    .map_err(|error| error.to_string())?;

  Ok(FfmpegExportResult {
    success: output.status.success(),
    command: std::iter::once(ffmpeg_binary().to_string()).chain(args).collect(),
    exit_code: output.status.code(),
    stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
    stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    output_file_path: request.output_file_path,
  })
}

#[tauri::command]
pub fn run_backend_scene_export(app: tauri::AppHandle, request: BackendSceneExportRequest) -> Result<FfmpegExportResult, String> {
  validate_backend_scene_export_request(&request)?;

  let cache_dir = app
    .path()
    .app_cache_dir()
    .map_err(|error| format!("Unable to resolve app cache directory: {error}"))?;
  let job_dir = cache_dir.join("backend-scene-exports").join(safe_job_id(&format!("job-{}", std::process::id())));
  if job_dir.exists() {
    fs::remove_dir_all(&job_dir).map_err(|error| format!("Unable to reset backend export directory: {error}"))?;
  }
  fs::create_dir_all(&job_dir).map_err(|error| format!("Unable to create backend export directory: {error}"))?;

  let mut scene_text_paths = Vec::new();
  for (index, scene) in request.scenes.iter().enumerate() {
    let text_path = job_dir.join(format!("scene-{index:03}-{}.txt", safe_job_id(&scene.id)));
    fs::write(&text_path, wrap_scene_text(&scene.text)).map_err(|error| format!("Unable to write scene text file: {error}"))?;
    scene_text_paths.push(text_path);
  }

  let background_color = normalize_hex_color(request.background_color.as_deref(), "0x090A0D");
  let filter = build_backend_filter(&request, &scene_text_paths);
  let input = format!(
    "color=c={}:s={}x{}:r={}:d={:.3}",
    background_color,
    request.width,
    request.height,
    request.fps,
    request.duration
  );

  let args = vec![
    "-y".to_string(),
    "-f".to_string(),
    "lavfi".to_string(),
    "-i".to_string(),
    input,
    "-vf".to_string(),
    filter,
    "-t".to_string(),
    format!("{:.3}", request.duration),
    "-c:v".to_string(),
    "libx264".to_string(),
    "-preset".to_string(),
    "ultrafast".to_string(),
    "-crf".to_string(),
    "22".to_string(),
    "-pix_fmt".to_string(),
    "yuv420p".to_string(),
    "-movflags".to_string(),
    "+faststart".to_string(),
    request.output_file_path.clone(),
  ];

  let output = Command::new(ffmpeg_binary())
    .args(&args)
    .output()
    .map_err(|error| error.to_string());

  let _ = fs::remove_dir_all(&job_dir);
  let output = output?;

  Ok(FfmpegExportResult {
    success: output.status.success(),
    command: std::iter::once(ffmpeg_binary().to_string()).chain(args).collect(),
    exit_code: output.status.code(),
    stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
    stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    output_file_path: request.output_file_path,
  })
}
