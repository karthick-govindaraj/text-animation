use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Mirrors the frontend `AnimationStyle` union type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AnimationStyle {
    Punch,
    Cascade,
    Typewriter,
    Drift,
    TiktokBounce,
    ShortsPop,
    Karaoke,
    Glitch,
    LowerThird,
    WordZoom,
    CaptionStack,
    NeonFlicker,
    MinimalFade,
    Stomp,
    ElasticPop,
    NewsTicker,
    CleanSubtitle,
    ComicPop,
    LuxuryTitle,
    TechHud,
}

/// Mirrors the frontend `TextAlign` union type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextAlign {
    Left,
    Center,
    Right,
    Justify,
}

/// Highlight shape for active words.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HighlightShape {
    Pill,
    Box,
    Underline,
    None,
}

/// Caption position preset.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CaptionPosition {
    Upper,
    Center,
    Lower,
    SafeLower,
}

/// Safe-area preset.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SafeAreaPreset {
    None,
    Tiktok,
    Reels,
    Shorts,
}

/// Text color mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextColorMode {
    Solid,
    Gradient,
}

/// A single scene in the project – subset of fields relevant to layout/rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeScene {
    pub id: String,
    pub text: String,
    pub duration: f64,
    pub animation_style: AnimationStyle,
    pub accent: String,
    pub active_word_count: u32,
    pub offset_x: f64,
    pub offset_y: f64,
    #[serde(default)]
    pub word_colors: HashMap<String, String>,
    /// Image layers for B-roll (up to 10). Legacy `broll` maps to layer 0.
    #[serde(default)]
    pub image_layers: Vec<ImageLayer>,
    /// Camera motion (Ken Burns) for this scene.
    #[serde(default)]
    pub camera: Option<CameraMotion>,
    /// Transition into this scene.
    #[serde(default)]
    pub transition: Option<SceneTransition>,
    /// Graphics overlay layers.
    #[serde(default)]
    pub graphic_layers: Vec<GraphicLayer>,
    /// Video layers (model only; frame decoding is stubbed).
    #[serde(default)]
    pub video_layers: Vec<VideoLayer>,
}

/// Font/typography controls that mirror the frontend `FontControls`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFontControls {
    pub family: String,
    pub weight: u32,
    pub size_scale: f64,
    pub uppercase: bool,
    pub letter_spacing: f64,
    pub line_height: f64,
    pub stroke_width: f64,
    pub shadow_blur: f64,
    pub max_words_per_line: u32,
    pub text_align: TextAlign,
    pub text_color: String,
    #[serde(default = "default_highlight_none")]
    pub highlight_shape: HighlightShape,
    #[serde(default = "default_position_center")]
    pub position: CaptionPosition,
    #[serde(default = "default_text_color_mode")]
    pub text_color_mode: TextColorMode,
    #[serde(default)]
    pub gradient_from: String,
    #[serde(default)]
    pub gradient_mid: String,
    #[serde(default)]
    pub gradient_to: String,
    #[serde(default)]
    pub gradient_direction: f64,
}

fn default_highlight_none() -> HighlightShape {
    HighlightShape::None
}
fn default_position_center() -> CaptionPosition {
    CaptionPosition::Center
}
fn default_text_color_mode() -> TextColorMode {
    TextColorMode::Solid
}

/// Top-level project model sent from the frontend for native rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRenderProject {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration: f64,
    pub scenes: Vec<NativeScene>,
    pub font: NativeFontControls,
    #[serde(default = "default_safe_area")]
    pub safe_area: SafeAreaPreset,
}

fn default_safe_area() -> SafeAreaPreset {
    SafeAreaPreset::None
}

// ─── Image Layer ───

/// How an image fits its container.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageFit {
    Cover,
    Contain,
    Stretch,
}

impl Default for ImageFit {
    fn default() -> Self {
        ImageFit::Cover
    }
}

/// Entrance/exit effect for image layers.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ImageEffect {
    None,
    FadeIn,
    FadeOut,
    SlideLeft,
    SlideRight,
    SlideUp,
    SlideDown,
    ZoomIn,
    ZoomOut,
}

impl Default for ImageEffect {
    fn default() -> Self {
        ImageEffect::None
    }
}

/// Crop rectangle (normalized 0..1).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRect {
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default = "default_one")]
    pub width: f64,
    #[serde(default = "default_one")]
    pub height: f64,
}

impl Default for CropRect {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0, width: 1.0, height: 1.0 }
    }
}

fn default_one() -> f64 {
    1.0
}

/// A single image layer in a scene.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageLayer {
    /// Local file path or workspace-relative path.
    pub path: String,
    /// Fallback asset candidates (tried in order if primary fails).
    #[serde(default)]
    pub fallbacks: Vec<String>,
    /// Start time within the scene (seconds).
    #[serde(default)]
    pub start: f64,
    /// End time within the scene (seconds). 0 = scene duration.
    #[serde(default)]
    pub end: f64,
    /// Z-index for layer ordering.
    #[serde(default)]
    pub z_index: i32,
    /// Fit mode.
    #[serde(default)]
    pub fit: ImageFit,
    /// Opacity 0..1.
    #[serde(default = "default_one")]
    pub opacity: f64,
    /// Gaussian blur radius.
    #[serde(default)]
    pub blur: f64,
    /// Darken overlay 0..1.
    #[serde(default)]
    pub darken: f64,
    /// Vignette intensity 0..1.
    #[serde(default)]
    pub vignette: f64,
    /// Crop rectangle (normalized).
    #[serde(default)]
    pub crop: CropRect,
    /// Entrance effect.
    #[serde(default)]
    pub entrance: ImageEffect,
    /// Exit effect.
    #[serde(default)]
    pub exit: ImageEffect,
}

// ─── Camera Motion (Ken Burns) ───

/// Camera motion / Ken Burns effect for a scene.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraMotion {
    #[serde(default = "default_one")]
    pub zoom_from: f64,
    #[serde(default = "default_one")]
    pub zoom_to: f64,
    #[serde(default)]
    pub pan_x_from: f64,
    #[serde(default)]
    pub pan_x_to: f64,
    #[serde(default)]
    pub pan_y_from: f64,
    #[serde(default)]
    pub pan_y_to: f64,
    #[serde(default = "default_easing_str")]
    pub easing: String,
}

fn default_easing_str() -> String {
    "ease-in-out".to_string()
}

impl Default for CameraMotion {
    fn default() -> Self {
        Self {
            zoom_from: 1.0,
            zoom_to: 1.0,
            pan_x_from: 0.0,
            pan_x_to: 0.0,
            pan_y_from: 0.0,
            pan_y_to: 0.0,
            easing: "ease-in-out".to_string(),
        }
    }
}

// ─── Scene Transitions ───

/// Scene transition type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransitionType {
    Cut,
    Fade,
    Zoom,
    Slide,
    Blur,
    Flash,
    Glitch,
}

impl Default for TransitionType {
    fn default() -> Self {
        TransitionType::Cut
    }
}

/// Scene transition configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneTransition {
    #[serde(default)]
    pub transition_type: TransitionType,
    /// Duration of the transition in seconds.
    #[serde(default = "default_transition_duration")]
    pub duration: f64,
}

fn default_transition_duration() -> f64 {
    0.3
}

impl Default for SceneTransition {
    fn default() -> Self {
        Self {
            transition_type: TransitionType::Cut,
            duration: 0.3,
        }
    }
}

// ─── Graphics Layer ───

/// Type of graphic overlay.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GraphicType {
    Arrow,
    Circle,
    Underline,
    WarningLabel,
    StatCard,
    QuoteCard,
    HudOverlay,
    Custom,
}

impl Default for GraphicType {
    fn default() -> Self {
        GraphicType::Custom
    }
}

/// A graphics overlay layer.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphicLayer {
    #[serde(default)]
    pub graphic_type: GraphicType,
    /// Path to external asset file (preferred over code-generated).
    #[serde(default)]
    pub asset_path: String,
    /// Fallback: legacy JSON graphic definition.
    #[serde(default)]
    pub legacy_json: Option<String>,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default = "default_one")]
    pub width: f64,
    #[serde(default = "default_one")]
    pub height: f64,
    #[serde(default = "default_one")]
    pub opacity: f64,
    #[serde(default)]
    pub rotation: f64,
    #[serde(default)]
    pub start: f64,
    #[serde(default)]
    pub end: f64,
    #[serde(default)]
    pub z_index: i32,
    #[serde(default)]
    pub keyframes: Vec<Keyframe>,
}

// ─── Video Layer ───

/// A local video layer in a scene.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoLayer {
    /// Local file path.
    pub path: String,
    /// Start time within scene (seconds).
    #[serde(default)]
    pub start: f64,
    /// End time within scene (seconds). 0 = scene duration.
    #[serde(default)]
    pub end: f64,
    /// Trim-in point of the source video (seconds).
    #[serde(default)]
    pub trim_in: f64,
    /// Trim-out point of the source video (seconds). 0 = video end.
    #[serde(default)]
    pub trim_out: f64,
    /// Playback speed multiplier.
    #[serde(default = "default_one")]
    pub speed: f64,
    /// Mute audio from this video layer.
    #[serde(default)]
    pub mute: bool,
    #[serde(default = "default_one")]
    pub opacity: f64,
    #[serde(default)]
    pub fit: ImageFit,
    #[serde(default)]
    pub crop: CropRect,
    #[serde(default)]
    pub entrance: ImageEffect,
    #[serde(default)]
    pub exit: ImageEffect,
    #[serde(default)]
    pub z_index: i32,
    #[serde(default)]
    pub chroma_key: Option<ChromaKey>,
    #[serde(default)]
    pub keyframes: Vec<Keyframe>,
}

// ─── Keyframe Model ───

/// A keyframe for visual element animation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Keyframe {
    /// Time offset within the element's lifetime (seconds).
    pub time: f64,
    #[serde(default)]
    pub x: Option<f64>,
    #[serde(default)]
    pub y: Option<f64>,
    #[serde(default)]
    pub scale: Option<f64>,
    #[serde(default)]
    pub rotation: Option<f64>,
    #[serde(default)]
    pub opacity: Option<f64>,
    #[serde(default)]
    pub blur: Option<f64>,
    #[serde(default)]
    pub crop_x: Option<f64>,
    #[serde(default)]
    pub crop_y: Option<f64>,
    #[serde(default)]
    pub crop_w: Option<f64>,
    #[serde(default)]
    pub crop_h: Option<f64>,
    #[serde(default = "default_easing_str")]
    pub easing: String,
}

// ─── Chroma Key ───

/// Chroma key (green/blue screen) configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChromaKey {
    #[serde(default)]
    pub enabled: bool,
    /// Key color in hex (e.g. "#00FF00" for green screen).
    #[serde(default = "default_green")]
    pub key_color: String,
    /// How similar colors must be to be keyed (0..1).
    #[serde(default = "default_chroma_similarity")]
    pub similarity: f64,
    /// Edge smoothness (0..1).
    #[serde(default = "default_chroma_smoothness")]
    pub smoothness: f64,
    /// Spill reduction (0..1).
    #[serde(default = "default_chroma_spill")]
    pub spill_reduction: f64,
    /// Edge softness in pixels.
    #[serde(default = "default_chroma_edge")]
    pub edge_softness: f64,
    /// Preset name: "green", "blue", or "custom".
    #[serde(default = "default_chroma_preset")]
    pub preset: String,
}

fn default_green() -> String {
    "#00FF00".to_string()
}
fn default_chroma_similarity() -> f64 {
    0.4
}
fn default_chroma_smoothness() -> f64 {
    0.08
}
fn default_chroma_spill() -> f64 {
    0.1
}
fn default_chroma_edge() -> f64 {
    1.0
}
fn default_chroma_preset() -> String {
    "green".to_string()
}

impl Default for ChromaKey {
    fn default() -> Self {
        Self {
            enabled: false,
            key_color: default_green(),
            similarity: default_chroma_similarity(),
            smoothness: default_chroma_smoothness(),
            spill_reduction: default_chroma_spill(),
            edge_softness: default_chroma_edge(),
            preset: default_chroma_preset(),
        }
    }
}

impl ChromaKey {
    /// Validate chroma key parameters are within valid ranges.
    pub fn validate(&self) -> Result<(), String> {
        if self.similarity < 0.0 || self.similarity > 1.0 {
            return Err(format!("Chroma key similarity out of range: {}", self.similarity));
        }
        if self.smoothness < 0.0 || self.smoothness > 1.0 {
            return Err(format!("Chroma key smoothness out of range: {}", self.smoothness));
        }
        if self.spill_reduction < 0.0 || self.spill_reduction > 1.0 {
            return Err(format!("Chroma key spill_reduction out of range: {}", self.spill_reduction));
        }
        if self.edge_softness < 0.0 || self.edge_softness > 50.0 {
            return Err(format!("Chroma key edge_softness out of range: {}", self.edge_softness));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chroma_key_default_valid() {
        let ck = ChromaKey::default();
        assert!(ck.validate().is_ok());
    }

    #[test]
    fn test_chroma_key_invalid_similarity() {
        let mut ck = ChromaKey::default();
        ck.similarity = 1.5;
        assert!(ck.validate().is_err());
    }

    #[test]
    fn test_chroma_key_invalid_smoothness() {
        let mut ck = ChromaKey::default();
        ck.smoothness = -0.1;
        assert!(ck.validate().is_err());
    }

    #[test]
    fn test_chroma_key_invalid_edge() {
        let mut ck = ChromaKey::default();
        ck.edge_softness = 100.0;
        assert!(ck.validate().is_err());
    }
}
