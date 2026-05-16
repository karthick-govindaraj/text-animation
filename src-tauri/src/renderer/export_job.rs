use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use super::model::NativeRenderProject;
use super::paint;

// ─── Job State ───

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobState {
    Queued,
    PreparingAssets,
    RenderingFrames,
    Encoding,
    Completed,
    Failed,
    Cancelled,
}

// ─── Export Preset ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPreset {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub bitrate_kbps: u32,
    pub format: String,
}

impl ExportPreset {
    pub fn youtube_shorts() -> Self {
        Self { name: "YouTube Shorts".into(), width: 1080, height: 1920, fps: 30, bitrate_kbps: 8000, format: "mp4".into() }
    }
    pub fn instagram_reels() -> Self {
        Self { name: "Instagram Reels".into(), width: 1080, height: 1920, fps: 30, bitrate_kbps: 8000, format: "mp4".into() }
    }
    pub fn square() -> Self {
        Self { name: "Square".into(), width: 1080, height: 1080, fps: 30, bitrate_kbps: 6000, format: "mp4".into() }
    }
    pub fn landscape() -> Self {
        Self { name: "Landscape".into(), width: 1920, height: 1080, fps: 30, bitrate_kbps: 10000, format: "mp4".into() }
    }
    pub fn all_presets() -> Vec<Self> {
        vec![Self::youtube_shorts(), Self::instagram_reels(), Self::square(), Self::landscape()]
    }
}

// ─── Job Manifest ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportManifest {
    pub job_id: String,
    pub state: JobState,
    pub preset: ExportPreset,
    pub total_frames: u32,
    pub rendered_frames: u32,
    pub output_path: String,
    pub error: Option<String>,
}

// ─── Job folder structure ───

pub fn job_dir(cache_root: &Path, job_id: &str) -> PathBuf {
    cache_root.join("exports").join(job_id)
}

pub fn create_job_structure(cache_root: &Path, job_id: &str) -> Result<PathBuf, String> {
    let dir = job_dir(cache_root, job_id);
    for sub in &["frames", "logs"] {
        fs::create_dir_all(dir.join(sub))
            .map_err(|e| format!("Failed to create job dir: {}", e))?;
    }
    Ok(dir)
}

pub fn frame_path(job_root: &Path, frame_index: u32) -> PathBuf {
    job_root.join("frames").join(format!("frame_{:06}.png", frame_index))
}

pub fn manifest_path(job_root: &Path) -> PathBuf {
    job_root.join("manifest.json")
}

pub fn write_manifest(job_root: &Path, manifest: &ExportManifest) -> Result<(), String> {
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("Serialize manifest: {}", e))?;
    fs::write(manifest_path(job_root), json)
        .map_err(|e| format!("Write manifest: {}", e))?;
    Ok(())
}

// ─── FFmpeg command ───

pub fn build_ffmpeg_command(
    job_root: &Path,
    output_path: &Path,
    fps: u32,
    bitrate_kbps: u32,
) -> Vec<String> {
    let frame_pattern = job_root.join("frames").join("frame_%06d.png");
    vec![
        "ffmpeg".to_string(),
        "-y".to_string(),
        "-framerate".to_string(), fps.to_string(),
        "-i".to_string(), frame_pattern.to_string_lossy().into_owned(),
        "-c:v".to_string(), "libx264".to_string(),
        "-pix_fmt".to_string(), "yuv420p".to_string(),
        "-b:v".to_string(), format!("{}k", bitrate_kbps),
        "-movflags".to_string(), "+faststart".to_string(),
        output_path.to_string_lossy().into_owned(),
    ]
}

// ─── State transitions ───

impl ExportManifest {
    pub fn can_transition_to(&self, next: &JobState) -> bool {
        use JobState::*;
        matches!(
            (&self.state, next),
            (Queued, PreparingAssets)
                | (PreparingAssets, RenderingFrames)
                | (RenderingFrames, Encoding)
                | (Encoding, Completed)
                | (Queued, Cancelled)
                | (PreparingAssets, Cancelled)
                | (RenderingFrames, Cancelled)
                | (Encoding, Cancelled)
                | (Queued, Failed)
                | (PreparingAssets, Failed)
                | (RenderingFrames, Failed)
                | (Encoding, Failed)
        )
    }

    pub fn transition(&mut self, next: JobState) -> Result<(), String> {
        if self.can_transition_to(&next) {
            self.state = next;
            Ok(())
        } else {
            Err(format!(
                "Invalid state transition: {:?} -> {:?}",
                self.state, next
            ))
        }
    }
}

// ─── Render frames (synchronous, for use in a background thread) ───

/// Render all frames for a project into the job's frames directory.
/// Returns the number of frames rendered.
pub fn render_all_frames(
    project: &NativeRenderProject,
    job_root: &Path,
    cancel_flag: &Arc<Mutex<bool>>,
) -> Result<u32, String> {
    let total_frames = (project.duration * project.fps as f64).ceil() as u32;
    let frames_dir = job_root.join("frames");
    fs::create_dir_all(&frames_dir)
        .map_err(|e| format!("Create frames dir: {}", e))?;

    for i in 0..total_frames {
        // Check cancellation
        if *cancel_flag.lock().unwrap() {
            return Err("Export cancelled".to_string());
        }

        let time = i as f64 / project.fps as f64;
        let png_bytes = paint::render_frame_png(project, time)?;
        let path = frame_path(job_root, i);
        fs::write(&path, &png_bytes)
            .map_err(|e| format!("Write frame {}: {}", i, e))?;
    }

    Ok(total_frames)
}

// ─── Cleanup ───

pub fn cleanup_job(cache_root: &Path, job_id: &str) -> Result<(), String> {
    let dir = job_dir(cache_root, job_id);
    if dir.exists() {
        fs::remove_dir_all(&dir)
            .map_err(|e| format!("Cleanup failed: {}", e))?;
    }
    Ok(())
}

// ─── Tests ───

#[cfg(test)]
mod tests {
    use super::*;

    fn test_manifest() -> ExportManifest {
        ExportManifest {
            job_id: "test-001".to_string(),
            state: JobState::Queued,
            preset: ExportPreset::youtube_shorts(),
            total_frames: 90,
            rendered_frames: 0,
            output_path: "/tmp/test.mp4".to_string(),
            error: None,
        }
    }

    #[test]
    fn test_valid_state_transitions() {
        let mut m = test_manifest();
        assert!(m.transition(JobState::PreparingAssets).is_ok());
        assert_eq!(m.state, JobState::PreparingAssets);
        assert!(m.transition(JobState::RenderingFrames).is_ok());
        assert!(m.transition(JobState::Encoding).is_ok());
        assert!(m.transition(JobState::Completed).is_ok());
    }

    #[test]
    fn test_invalid_state_transition() {
        let mut m = test_manifest();
        assert!(m.transition(JobState::Completed).is_err());
        assert!(m.transition(JobState::Encoding).is_err());
    }

    #[test]
    fn test_cancel_from_any_active_state() {
        for start in &[JobState::Queued, JobState::PreparingAssets, JobState::RenderingFrames, JobState::Encoding] {
            let mut m = test_manifest();
            m.state = start.clone();
            assert!(m.transition(JobState::Cancelled).is_ok());
        }
    }

    #[test]
    fn test_fail_from_any_active_state() {
        for start in &[JobState::Queued, JobState::PreparingAssets, JobState::RenderingFrames, JobState::Encoding] {
            let mut m = test_manifest();
            m.state = start.clone();
            assert!(m.transition(JobState::Failed).is_ok());
        }
    }

    #[test]
    fn test_frame_path_format() {
        let p = frame_path(Path::new("/job"), 42);
        assert_eq!(p, PathBuf::from("/job/frames/frame_000042.png"));
    }

    #[test]
    fn test_ffmpeg_command() {
        let cmd = build_ffmpeg_command(
            Path::new("/job"),
            Path::new("/out/video.mp4"),
            30,
            8000,
        );
        assert_eq!(cmd[0], "ffmpeg");
        assert!(cmd.contains(&"-framerate".to_string()));
        assert!(cmd.contains(&"30".to_string()));
        assert!(cmd.contains(&"8000k".to_string()));
        assert!(cmd.last().unwrap().ends_with("video.mp4"));
    }

    #[test]
    fn test_job_dir_structure() {
        let tmp = std::env::temp_dir().join("test_export_job");
        let _ = fs::remove_dir_all(&tmp);
        let job_root = create_job_structure(&tmp, "j1").unwrap();
        assert!(job_root.join("frames").is_dir());
        assert!(job_root.join("logs").is_dir());
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_presets() {
        let presets = ExportPreset::all_presets();
        assert_eq!(presets.len(), 4);
        assert_eq!(presets[0].name, "YouTube Shorts");
    }
}
