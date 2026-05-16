use serde::{Deserialize, Serialize};
use serde_json::Value;

// ─── Schema Version ───

pub const CURRENT_VERSION: u32 = 3;
pub const CURRENT_SCHEMA: &str = "scene-production-v3";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaHeader {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default = "default_schema")]
    pub schema: String,
}

fn default_version() -> u32 { 1 }
fn default_schema() -> String { "unknown".to_string() }

// ─── Migration ───

/// Migrate a project JSON from any version to v3.
/// Returns the migrated JSON value.
pub fn migrate_to_v3(mut json: Value) -> Result<Value, String> {
    let version = json.get("version").and_then(|v| v.as_u64()).unwrap_or(1) as u32;

    if version > CURRENT_VERSION {
        return Err(format!("Unknown schema version: {}", version));
    }

    // v1 → v2: add default font controls, safe area
    if version < 2 {
        if json.get("font").is_none() {
            json["font"] = serde_json::json!({
                "family": "sans-serif",
                "weight": 900,
                "sizeScale": 1.0,
                "uppercase": true,
                "letterSpacing": 0.0,
                "lineHeight": 1.08,
                "strokeWidth": 0.06,
                "shadowBlur": 24.0,
                "maxWordsPerLine": 4,
                "textAlign": "center",
                "textColor": "#F4F2EA",
                "highlightShape": "none",
                "position": "center",
                "textColorMode": "solid"
            });
        }
        if json.get("safeArea").is_none() {
            json["safeArea"] = Value::String("none".to_string());
        }
    }

    // v2 → v3: add image/video/graphic layers, camera, transitions to scenes
    if version < 3 {
        if let Some(scenes) = json.get_mut("scenes").and_then(|s| s.as_array_mut()) {
            for scene in scenes.iter_mut() {
                if scene.get("imageLayers").is_none() {
                    scene["imageLayers"] = Value::Array(vec![]);
                }
                if scene.get("videoLayers").is_none() {
                    scene["videoLayers"] = Value::Array(vec![]);
                }
                if scene.get("graphicLayers").is_none() {
                    scene["graphicLayers"] = Value::Array(vec![]);
                }
                if scene.get("wordColors").is_none() {
                    scene["wordColors"] = serde_json::json!({});
                }
            }
        }
    }

    json["version"] = Value::Number(CURRENT_VERSION.into());
    json["schema"] = Value::String(CURRENT_SCHEMA.to_string());

    Ok(json)
}

// ─── Validation ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub severity: String, // "error" | "warning"
    pub field: String,
    pub message: String,
}

/// Validate a project JSON and return a list of issues.
pub fn validate_project(json: &Value) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    // Top-level fields
    check_field(json, "width", "number", &mut issues);
    check_field(json, "height", "number", &mut issues);
    check_field(json, "fps", "number", &mut issues);
    check_field(json, "duration", "number", &mut issues);

    // Optional top-level
    if let Some(fps) = json.get("fps").and_then(|v| v.as_u64()) {
        if fps == 0 || fps > 120 {
            issues.push(ValidationIssue {
                severity: "error".into(),
                field: "fps".into(),
                message: format!("FPS out of range: {}", fps),
            });
        }
    }

    if let Some(duration) = json.get("duration").and_then(|v| v.as_f64()) {
        if duration <= 0.0 {
            issues.push(ValidationIssue {
                severity: "error".into(),
                field: "duration".into(),
                message: "Duration must be positive".into(),
            });
        }
    }

    // Scenes
    match json.get("scenes").and_then(|s| s.as_array()) {
        None => issues.push(ValidationIssue {
            severity: "error".into(),
            field: "scenes".into(),
            message: "Missing scenes array".into(),
        }),
        Some(scenes) => {
            if scenes.is_empty() {
                issues.push(ValidationIssue {
                    severity: "error".into(),
                    field: "scenes".into(),
                    message: "No scenes defined".into(),
                });
            }
            for (i, scene) in scenes.iter().enumerate() {
                validate_scene(scene, i, &mut issues);
            }
        }
    }

    // Font
    if json.get("font").is_none() {
        issues.push(ValidationIssue {
            severity: "warning".into(),
            field: "font".into(),
            message: "Missing font controls, defaults will be used".into(),
        });
    }

    issues
}

fn validate_scene(scene: &Value, index: usize, issues: &mut Vec<ValidationIssue>) {
    let prefix = format!("scenes[{}]", index);

    if scene.get("text").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
        issues.push(ValidationIssue {
            severity: "error".into(),
            field: format!("{}.text", prefix),
            message: "Scene has no text".into(),
        });
    }

    let duration = scene.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);
    if duration <= 0.0 {
        issues.push(ValidationIssue {
            severity: "error".into(),
            field: format!("{}.duration", prefix),
            message: "Scene has no/zero duration".into(),
        });
    }

    // Check image layers
    if let Some(layers) = scene.get("imageLayers").and_then(|v| v.as_array()) {
        if layers.len() > 10 {
            issues.push(ValidationIssue {
                severity: "warning".into(),
                field: format!("{}.imageLayers", prefix),
                message: format!("Too many image layers: {} (max 10)", layers.len()),
            });
        }
    }

    // Check word count per caption
    let text = scene.get("text").and_then(|v| v.as_str()).unwrap_or("");
    let word_count = text.split_whitespace().count();
    if word_count > 20 {
        issues.push(ValidationIssue {
            severity: "warning".into(),
            field: format!("{}.text", prefix),
            message: format!("Too many words per caption: {} (recommended < 20)", word_count),
        });
    }
}

fn check_field(json: &Value, field: &str, expected: &str, issues: &mut Vec<ValidationIssue>) {
    match json.get(field) {
        None => issues.push(ValidationIssue {
            severity: "error".into(),
            field: field.into(),
            message: format!("Missing required field: {}", field),
        }),
        Some(v) => {
            let ok = match expected {
                "number" => v.is_number(),
                "string" => v.is_string(),
                "array" => v.is_array(),
                _ => true,
            };
            if !ok {
                issues.push(ValidationIssue {
                    severity: "error".into(),
                    field: field.into(),
                    message: format!("Expected {} for field: {}", expected, field),
                });
            }
        }
    }
}

// ─── Quality Report ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QualityReport {
    pub issues: Vec<QualityIssue>,
    pub score: u32, // 0-100
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QualityIssue {
    pub category: String,
    pub severity: String,
    pub message: String,
}

/// Generate a quality report for a project JSON.
pub fn quality_report(json: &Value) -> QualityReport {
    let mut issues = Vec::new();
    let mut deductions = 0u32;

    let scenes = json.get("scenes").and_then(|s| s.as_array());

    // Missing scenes
    if scenes.is_none() || scenes.map(|s| s.is_empty()).unwrap_or(true) {
        issues.push(QualityIssue {
            category: "structure".into(),
            severity: "critical".into(),
            message: "No scenes defined".into(),
        });
        deductions += 50;
    }

    if let Some(scenes) = scenes {
        let mut animation_counts = std::collections::HashMap::new();

        for (i, scene) in scenes.iter().enumerate() {
            let text = scene.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let duration = scene.get("duration").and_then(|v| v.as_f64()).unwrap_or(0.0);

            // Missing text
            if text.trim().is_empty() {
                issues.push(QualityIssue {
                    category: "content".into(),
                    severity: "error".into(),
                    message: format!("Scene {} has no text", i + 1),
                });
                deductions += 10;
            }

            // Missing duration
            if duration <= 0.0 {
                issues.push(QualityIssue {
                    category: "timing".into(),
                    severity: "error".into(),
                    message: format!("Scene {} has no duration", i + 1),
                });
                deductions += 10;
            }

            // Missing B-roll
            let has_images = scene.get("imageLayers")
                .and_then(|v| v.as_array())
                .map(|a| !a.is_empty())
                .unwrap_or(false);
            if !has_images {
                issues.push(QualityIssue {
                    category: "visual".into(),
                    severity: "info".into(),
                    message: format!("Scene {} has no B-roll images", i + 1),
                });
                deductions += 2;
            }

            // No camera motion
            if scene.get("camera").is_none() {
                issues.push(QualityIssue {
                    category: "motion".into(),
                    severity: "info".into(),
                    message: format!("Scene {} has no camera motion", i + 1),
                });
                deductions += 1;
            }

            // Too many words
            let word_count = text.split_whitespace().count();
            if word_count > 15 {
                issues.push(QualityIssue {
                    category: "readability".into(),
                    severity: "warning".into(),
                    message: format!("Scene {} has {} words (recommended < 15)", i + 1, word_count),
                });
                deductions += 3;
            }

            // Animation overuse tracking
            if let Some(anim) = scene.get("animationStyle").and_then(|v| v.as_str()) {
                *animation_counts.entry(anim.to_string()).or_insert(0u32) += 1;
            }
        }

        // Repeated animation overuse
        let scene_count = scenes.len();
        for (anim, count) in &animation_counts {
            if *count as usize > scene_count / 2 && scene_count > 4 {
                issues.push(QualityIssue {
                    category: "variety".into(),
                    severity: "warning".into(),
                    message: format!("Animation '{}' used {} times out of {} scenes", anim, count, scene_count),
                });
                deductions += 5;
            }
        }
    }

    let score = 100u32.saturating_sub(deductions.min(100));

    QualityReport { issues, score }
}

// ─── Tauri commands ───

#[tauri::command]
pub fn migrate_project_v3(json: Value) -> Result<Value, String> {
    migrate_to_v3(json)
}

#[tauri::command]
pub fn validate_project_schema(json: Value) -> Vec<ValidationIssue> {
    validate_project(&json)
}

#[tauri::command]
pub fn generate_quality_report(json: Value) -> QualityReport {
    quality_report(&json)
}

// ─── Tests ───

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrate_v1_to_v3() {
        let v1 = serde_json::json!({
            "version": 1,
            "width": 1080,
            "height": 1920,
            "fps": 30,
            "duration": 3.0,
            "scenes": [
                { "id": "s1", "text": "Hello", "duration": 3.0, "animationStyle": "punch", "accent": "#FF0000", "activeWordCount": 1, "offsetX": 0, "offsetY": 0 }
            ]
        });
        let v3 = migrate_to_v3(v1).unwrap();
        assert_eq!(v3["version"], 3);
        assert_eq!(v3["schema"], "scene-production-v3");
        assert!(v3["font"].is_object());
        assert!(v3["scenes"][0]["imageLayers"].is_array());
    }

    #[test]
    fn test_migrate_v3_idempotent() {
        let v3 = serde_json::json!({
            "version": 3,
            "schema": "scene-production-v3",
            "width": 1080, "height": 1920, "fps": 30, "duration": 3.0,
            "font": {},
            "scenes": [{ "id": "s1", "text": "Hi", "duration": 3.0, "animationStyle": "punch", "accent": "#F00", "activeWordCount": 1, "offsetX": 0, "offsetY": 0, "imageLayers": [], "videoLayers": [], "graphicLayers": [], "wordColors": {} }]
        });
        let result = migrate_to_v3(v3.clone()).unwrap();
        assert_eq!(result["version"], 3);
    }

    #[test]
    fn test_migrate_future_version_fails() {
        let future = serde_json::json!({ "version": 99 });
        assert!(migrate_to_v3(future).is_err());
    }

    #[test]
    fn test_validate_missing_scenes() {
        let json = serde_json::json!({ "width": 1080, "height": 1920, "fps": 30, "duration": 3.0 });
        let issues = validate_project(&json);
        assert!(issues.iter().any(|i| i.field == "scenes" && i.severity == "error"));
    }

    #[test]
    fn test_validate_empty_scene_text() {
        let json = serde_json::json!({
            "width": 1080, "height": 1920, "fps": 30, "duration": 3.0,
            "scenes": [{ "text": "", "duration": 3.0 }]
        });
        let issues = validate_project(&json);
        assert!(issues.iter().any(|i| i.field.contains("text") && i.severity == "error"));
    }

    #[test]
    fn test_validate_valid_project() {
        let json = serde_json::json!({
            "width": 1080, "height": 1920, "fps": 30, "duration": 3.0,
            "font": {},
            "scenes": [{ "text": "Hello World", "duration": 3.0 }]
        });
        let issues = validate_project(&json);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == "error").collect();
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);
    }

    #[test]
    fn test_quality_report_no_scenes() {
        let json = serde_json::json!({});
        let report = quality_report(&json);
        assert!(report.score < 60);
        assert!(report.issues.iter().any(|i| i.category == "structure"));
    }

    #[test]
    fn test_quality_report_good_project() {
        let json = serde_json::json!({
            "scenes": [
                { "text": "Hello World", "duration": 3.0, "imageLayers": [{"path": "img.png"}], "camera": {"zoomFrom": 1.0, "zoomTo": 1.1}, "animationStyle": "punch" },
                { "text": "Second", "duration": 2.0, "imageLayers": [{"path": "img2.png"}], "camera": {"zoomFrom": 1.0, "zoomTo": 1.2}, "animationStyle": "cascade" }
            ]
        });
        let report = quality_report(&json);
        assert!(report.score >= 80, "Expected good score, got: {}", report.score);
    }

    #[test]
    fn test_quality_report_animation_overuse() {
        let scenes: Vec<_> = (0..6).map(|i| {
            serde_json::json!({
                "text": format!("Scene {}", i),
                "duration": 2.0,
                "animationStyle": "punch"
            })
        }).collect();
        let json = serde_json::json!({ "scenes": scenes });
        let report = quality_report(&json);
        assert!(report.issues.iter().any(|i| i.category == "variety"));
    }
}
