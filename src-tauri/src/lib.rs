mod native_export;
mod renderer;
mod schema;
mod workspace;

use renderer::engine;
use renderer::export_job::{
    self, ExportManifest, ExportPreset, JobState,
};
use renderer::layout::LayoutResult;
use renderer::model::NativeRenderProject;
use renderer::paint;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};

#[tauri::command]
fn debug_native_layout(project: NativeRenderProject) -> Result<LayoutResult, String> {
  engine::debug_layout(&project).ok_or_else(|| "No scenes in project".to_string())
}

#[tauri::command]
fn render_native_frame_png(project: NativeRenderProject, time: f64) -> Result<Vec<u8>, String> {
  paint::render_frame_png(&project, time)
}

#[tauri::command]
fn get_export_presets() -> Vec<ExportPreset> {
  ExportPreset::all_presets()
}

#[tauri::command]
fn start_native_export(
  mut project: NativeRenderProject,
  cache_root: String,
  job_id: String,
  preset_name: String,
  output_file_path: Option<String>,
) -> Result<ExportManifest, String> {
  let preset = ExportPreset::all_presets()
    .into_iter()
    .find(|p| p.name == preset_name)
    .unwrap_or_else(ExportPreset::youtube_shorts);

  project.width = preset.width;
  project.height = preset.height;
  project.fps = preset.fps;

  let total_frames = (project.duration * preset.fps as f64).ceil() as u32;
  let job_root = export_job::create_job_structure(Path::new(&cache_root), &job_id)?;
  let output_path = output_file_path
    .map(PathBuf::from)
    .unwrap_or_else(|| job_root.join(format!("output.{}", preset.format)));

  let mut manifest = ExportManifest {
    job_id: job_id.clone(),
    state: JobState::Queued,
    preset,
    total_frames,
    rendered_frames: 0,
    output_path: output_path.to_string_lossy().into_owned(),
    error: None,
  };

  export_job::write_manifest(&job_root, &manifest)?;

  manifest.transition(JobState::PreparingAssets)?;
  export_job::write_manifest(&job_root, &manifest)?;

  manifest.transition(JobState::RenderingFrames)?;
  export_job::write_manifest(&job_root, &manifest)?;

  let cancel_flag = Arc::new(Mutex::new(false));
  match export_job::render_all_frames(&project, &job_root, &cancel_flag) {
    Ok(rendered) => {
      manifest.rendered_frames = rendered;
      export_job::write_manifest(&job_root, &manifest)?;
    }
    Err(err) => {
      manifest.transition(JobState::Failed)?;
      manifest.error = Some(err.clone());
      let _ = export_job::write_manifest(&job_root, &manifest);
      return Err(err);
    }
  }

  manifest.transition(JobState::Encoding)?;
  export_job::write_manifest(&job_root, &manifest)?;

  let command = export_job::build_ffmpeg_command(
    &job_root,
    &output_path,
    manifest.preset.fps,
    manifest.preset.bitrate_kbps,
  );
  let (program, args) = command
    .split_first()
    .ok_or_else(|| "FFmpeg command was empty".to_string())?;
  let output = Command::new(program)
    .args(args)
    .output()
    .map_err(|err| format!("Failed to start FFmpeg: {}", err))?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
    let message = if stderr.trim().is_empty() {
      format!("FFmpeg failed with status {}", output.status)
    } else {
      stderr
    };
    manifest.transition(JobState::Failed)?;
    manifest.error = Some(message.clone());
    let _ = export_job::write_manifest(&job_root, &manifest);
    return Err(message);
  }

  manifest.transition(JobState::Completed)?;
  manifest.output_path = output_path.to_string_lossy().into_owned();
  export_job::write_manifest(&job_root, &manifest)?;
  Ok(manifest)
}

#[tauri::command]
fn cleanup_export_job(cache_root: String, job_id: String) -> Result<(), String> {
  export_job::cleanup_job(std::path::Path::new(&cache_root), &job_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      native_export::check_ffmpeg_available,
      native_export::create_native_frame_directory,
      native_export::write_native_jpeg_frame,
      native_export::cleanup_native_frame_directory,
      native_export::run_ffmpeg_export,
      native_export::run_backend_scene_export,
      workspace::create_workspace_cmd,
      workspace::open_workspace_cmd,
      workspace::cache_remote_image_cmd,
      workspace::validate_project_assets_cmd,
      workspace::import_local_asset_cmd,
      workspace::resolve_asset_path_cmd,
      debug_native_layout,
      render_native_frame_png,
      get_export_presets,
      start_native_export,
      cleanup_export_job,
      schema::migrate_project_v3,
      schema::validate_project_schema,
      schema::generate_quality_report
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
