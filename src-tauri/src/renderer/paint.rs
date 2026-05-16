use skia_safe::{
    surfaces, BlurStyle, Canvas, Color4f, EncodedImageFormat, Font, FontMgr, FontStyle, MaskFilter,
    Paint, PaintStyle, RRect, Rect,
};

use super::animation::{get_style_transform, get_word_timing};
use super::caption::{compute_caption_layout, CaptionLayout, CaptionWord};
use super::model::{
    HighlightShape, NativeFontControls, NativeRenderProject, NativeScene, TextColorMode,
};

/// Resolve the active scene at a given global time using cumulative durations.
/// Returns (scene, local_time_within_scene).
pub fn active_scene_at(scenes: &[NativeScene], time: f64) -> Option<(&NativeScene, f64)> {
    let mut cursor = 0.0;
    for scene in scenes {
        let end = cursor + scene.duration;
        if time < end || std::ptr::eq(scene, scenes.last().unwrap()) {
            return Some((scene, (time - cursor).max(0.0)));
        }
        cursor = end;
    }
    None
}

/// Parse a CSS hex color string (#RGB, #RRGGBB, #RRGGBBAA) into a Skia Color4f.
fn parse_hex_color(hex: &str) -> Color4f {
    let hex = hex.trim_start_matches('#');
    let (r, g, b, a) = match hex.len() {
        3 => {
            let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).unwrap_or(255);
            let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).unwrap_or(255);
            let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).unwrap_or(255);
            (r, g, b, 255u8)
        }
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
            (r, g, b, 255u8)
        }
        8 => {
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
            let a = u8::from_str_radix(&hex[6..8], 16).unwrap_or(255);
            (r, g, b, a)
        }
        _ => (255, 255, 255, 255),
    };
    Color4f::new(
        r as f32 / 255.0,
        g as f32 / 255.0,
        b as f32 / 255.0,
        a as f32 / 255.0,
    )
}

/// Map a FontControls weight (100-900) to a Skia FontStyle.
fn font_style_from_weight(weight: u32) -> FontStyle {
    let w = skia_safe::font_style::Weight::from(weight as i32);
    FontStyle::new(w, skia_safe::font_style::Width::NORMAL, skia_safe::font_style::Slant::Upright)
}

/// Render a single frame at the given `time` (seconds) and return PNG bytes.
pub fn render_frame_png(project: &NativeRenderProject, time: f64) -> Result<Vec<u8>, String> {
    let w = project.width as i32;
    let h = project.height as i32;

    let mut surface =
        surfaces::raster_n32_premul((w, h)).ok_or("Failed to create Skia raster surface")?;

    let canvas = surface.canvas();

    // --- Background (solid dark) ---
    canvas.clear(parse_hex_color("#090A0D"));

    // --- Active scene ---
    let (scene, local_time) = active_scene_at(&project.scenes, time)
        .ok_or("No active scene at the requested time")?;

    // --- Camera motion for scene B-roll ---
    let camera_applied = scene.camera.is_some() && !scene.image_layers.is_empty();
    if let Some(ref camera) = scene.camera {
        if camera_applied {
            let progress = super::animation::scene_progress(local_time, scene.duration);
            canvas.save();
            super::broll::apply_camera_transform(canvas, camera, progress, w as f32, h as f32);
        }
    }

    // --- Image B-roll layers (behind captions) ---
    if !scene.image_layers.is_empty() {
        super::broll::render_image_layers(
            canvas,
            &scene.image_layers,
            local_time,
            scene.duration,
            w as f32,
            h as f32,
        );
    }

    if camera_applied {
        canvas.restore();
    }

    // --- Scene transition ---
    if let Some(ref transition) = scene.transition {
        let tp = super::broll::transition_progress(local_time, transition);
        super::broll::apply_transition(canvas, transition, tp, w as f32, h as f32);
    }

    // --- Graphics layers (with keyframe animation) ---
    render_graphic_layers(canvas, &scene.graphic_layers, local_time, w as f32, h as f32);

    // --- Caption layout ---
    let caption = compute_caption_layout(project, scene, local_time);

    // --- Resolve font ---
    let font_size = caption.font_size as f32;

    let font_mgr = FontMgr::new();
    let style = font_style_from_weight(project.font.weight);
    let typeface = font_mgr
        .match_family_style(&project.font.family, style)
        .or_else(|| font_mgr.match_family_style("sans-serif", style))
        .or_else(|| font_mgr.legacy_make_typeface(None, style))
        .ok_or("Failed to resolve any typeface")?;
    let font = Font::from_typeface(typeface, font_size);

    // --- Draw words ---
    draw_caption_words(
        canvas, &caption, &project.font, scene, &font, font_size, local_time, project.width as f64,
    );

    // --- Encode PNG ---
    let image = surface.image_snapshot();
    let data = image
        .encode(None, EncodedImageFormat::PNG, None)
        .ok_or("Failed to encode PNG")?;
    Ok(data.as_bytes().to_vec())
}

/// Render graphics overlay layers with keyframe interpolation.
fn render_graphic_layers(
    canvas: &Canvas,
    layers: &[super::model::GraphicLayer],
    local_time: f64,
    canvas_w: f32,
    canvas_h: f32,
) {
    use super::keyframe::interpolate_keyframes;

    let mut sorted: Vec<&super::model::GraphicLayer> = layers.iter().collect();
    sorted.sort_by_key(|l| l.z_index);

    for layer in sorted {
        let end = if layer.end <= 0.0 { f64::MAX } else { layer.end };
        if local_time < layer.start || local_time > end {
            continue;
        }

        // Keyframe interpolation
        let kf = interpolate_keyframes(&layer.keyframes, local_time - layer.start);

        let alpha = (layer.opacity * kf.opacity).clamp(0.0, 1.0) as f32;
        if alpha < 0.01 {
            continue;
        }

        // Try loading external asset image
        if let Some(img) = super::broll::load_image_with_fallback(&layer.asset_path, &[]) {
            canvas.save();

            let x = (layer.x + kf.x) as f32;
            let y = (layer.y + kf.y) as f32;
            let scale = kf.scale as f32;
            let rotation = kf.rotation as f32;

            canvas.translate((x, y));
            if rotation.abs() > 1e-4 {
                canvas.rotate(rotation * (180.0 / std::f32::consts::PI), None);
            }
            if (scale - 1.0).abs() > 1e-4 {
                canvas.scale((scale, scale));
            }

            let mut paint = Paint::default();
            paint.set_anti_alias(true);
            paint.set_alpha_f(alpha);

            let w = (layer.width * canvas_w as f64) as f32;
            let h = (layer.height * canvas_h as f64) as f32;
            let dst = Rect::from_xywh(0.0, 0.0, w, h);
            canvas.draw_image_rect(&img, None, dst, &paint);

            canvas.restore();
        }
        // If no asset loaded and legacy_json is present, skip (fallback compatibility preserved)
    }
}

/// Draw each word from the caption layout onto the canvas with full styling.
fn draw_caption_words(
    canvas: &Canvas,
    caption: &CaptionLayout,
    font_ctrl: &NativeFontControls,
    scene: &NativeScene,
    skia_font: &Font,
    font_size: f32,
    local_time: f64,
    canvas_width: f64,
) {
    let default_text_color = parse_hex_color(&font_ctrl.text_color);
    let accent_color = parse_hex_color(&scene.accent);
    let stroke_px = (font_ctrl.stroke_width * font_size as f64) as f32;
    let shadow_sigma = (font_ctrl.shadow_blur as f32).max(0.0);
    let word_count = caption.words.len();

    for word in &caption.words {
        // --- Animation transform ---
        let timing = get_word_timing(scene.duration, word_count, word.source_index);
        let transform = get_style_transform(
            &scene.animation_style,
            local_time,
            scene.duration,
            timing.start,
            word.source_index,
            word.line,
            word.x,
            word.y,
            caption.font_size,
            word.active,
            canvas_width,
        );

        // Skip invisible words
        if transform.alpha < 0.01 {
            continue;
        }

        let x = transform.x as f32;
        let y = transform.y as f32;
        let scale = transform.scale as f32;
        let alpha_f = transform.alpha as f32;

        canvas.save();

        // Apply transform: translate to word center, then scale/rotate/skew
        canvas.translate((x + word.width as f32 * 0.5, y));
        if transform.rotation.abs() > 1e-6 {
            canvas.rotate(transform.rotation as f32 * (180.0 / std::f32::consts::PI), None);
        }
        if (scale - 1.0).abs() > 1e-4 {
            canvas.scale((scale, scale));
        }
        // Translate back so text draws from word start
        canvas.translate((-word.width as f32 * 0.5, 0.0));

        // --- Highlight shape (behind text) ---
        let highlight_word = CaptionWord {
            x: 0.0,
            y: 0.0,
            ..word.clone()
        };
        draw_highlight(canvas, &highlight_word, font_ctrl, &accent_color, font_size);

        // --- Shadow layer ---
        let effective_shadow = if word.active { shadow_sigma * 1.55 } else { shadow_sigma };
        if effective_shadow > 1.0 {
            let mut shadow_paint = Paint::default();
            shadow_paint.set_anti_alias(true);
            shadow_paint.set_color4f(Color4f::new(0.0, 0.0, 0.0, 0.72 * alpha_f), None);
            shadow_paint.set_style(PaintStyle::Fill);
            shadow_paint.set_mask_filter(MaskFilter::blur(
                BlurStyle::Normal,
                effective_shadow * 0.5,
                false,
            ));
            let offset_y_shadow = if word.active { 8.0 } else { 5.0 };
            canvas.draw_str(&word.value, (0.0, offset_y_shadow), skia_font, &shadow_paint);
        }

        // --- Stroke layer ---
        if stroke_px > 0.5 {
            let mut stroke_paint = Paint::default();
            stroke_paint.set_anti_alias(true);
            stroke_paint.set_color4f(Color4f::new(0.0, 0.0, 0.0, 0.52 * alpha_f), None);
            stroke_paint.set_style(PaintStyle::Stroke);
            stroke_paint.set_stroke_width(stroke_px);
            canvas.draw_str(&word.value, (0.0, 0.0), skia_font, &stroke_paint);
        }

        // --- Fill layer ---
        let fill_color = resolve_word_color(word, font_ctrl, &default_text_color);
        let mut fill_paint = Paint::default();
        fill_paint.set_anti_alias(true);
        fill_paint.set_color4f(
            Color4f::new(fill_color.r, fill_color.g, fill_color.b, fill_color.a * alpha_f),
            None,
        );
        fill_paint.set_style(PaintStyle::Fill);
        canvas.draw_str(&word.value, (0.0, 0.0), skia_font, &fill_paint);

        canvas.restore();
    }
}

/// Resolve the fill color for a word: per-word color > gradient approx > solid.
fn resolve_word_color(
    word: &CaptionWord,
    font_ctrl: &NativeFontControls,
    default_color: &Color4f,
) -> Color4f {
    // Per-word color takes priority
    if let Some(ref hex) = word.color {
        return parse_hex_color(hex);
    }

    // Gradient approximation: interpolate from/mid/to based on source_index position
    if matches!(font_ctrl.text_color_mode, TextColorMode::Gradient)
        && !font_ctrl.gradient_from.is_empty()
    {
        let from = parse_hex_color(&font_ctrl.gradient_from);
        let mid = if font_ctrl.gradient_mid.is_empty() {
            from
        } else {
            parse_hex_color(&font_ctrl.gradient_mid)
        };
        let to = if font_ctrl.gradient_to.is_empty() {
            mid
        } else {
            parse_hex_color(&font_ctrl.gradient_to)
        };

        // Use x position as a rough interpolation factor (0..1 across canvas)
        let t = (word.source_index as f32 * 0.15).min(1.0);
        return if t < 0.5 {
            let u = t * 2.0;
            lerp_color(&from, &mid, u)
        } else {
            let u = (t - 0.5) * 2.0;
            lerp_color(&mid, &to, u)
        };
    }

    *default_color
}

fn lerp_color(a: &Color4f, b: &Color4f, t: f32) -> Color4f {
    Color4f::new(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t,
        a.a + (b.a - a.a) * t,
    )
}

/// Draw highlight shape behind the active word.
fn draw_highlight(
    canvas: &Canvas,
    word: &CaptionWord,
    font_ctrl: &NativeFontControls,
    accent_color: &Color4f,
    font_size: f32,
) {
    if !word.active {
        return;
    }
    match font_ctrl.highlight_shape {
        HighlightShape::None => {}
        HighlightShape::Pill => {
            let pad_x = font_size * 0.18;
            let height = font_size * 1.08;
            let rect = Rect::from_xywh(
                word.x as f32 - pad_x,
                word.y as f32 - height * 0.5,
                word.width as f32 + pad_x * 2.0,
                height,
            );
            let radius = height * 0.42;
            let rrect = RRect::new_rect_xy(rect, radius, radius);
            let mut paint = Paint::default();
            paint.set_anti_alias(true);
            paint.set_color4f(*accent_color, None);
            paint.set_alpha_f(0.92);
            paint.set_style(PaintStyle::Fill);
            canvas.draw_rrect(rrect, &paint);
        }
        HighlightShape::Box => {
            let pad_x = font_size * 0.18;
            let height = font_size * 1.08;
            let rect = Rect::from_xywh(
                word.x as f32 - pad_x,
                word.y as f32 - height * 0.5,
                word.width as f32 + pad_x * 2.0,
                height,
            );
            let radius = font_size * 0.08;
            let rrect = RRect::new_rect_xy(rect, radius, radius);
            let mut paint = Paint::default();
            paint.set_anti_alias(true);
            paint.set_color4f(*accent_color, None);
            paint.set_alpha_f(0.92);
            paint.set_style(PaintStyle::Fill);
            canvas.draw_rrect(rrect, &paint);
        }
        HighlightShape::Underline => {
            let pad_x = font_size * 0.18;
            let y_line = word.y as f32 + font_size * 0.54;
            let mut paint = Paint::default();
            paint.set_anti_alias(true);
            paint.set_color4f(*accent_color, None);
            paint.set_alpha_f(0.92);
            paint.set_style(PaintStyle::Stroke);
            paint.set_stroke_width((font_size * 0.055).max(4.0));
            canvas.draw_line(
                (word.x as f32 - pad_x * 0.5, y_line),
                (word.x as f32 + word.width as f32 + pad_x * 0.5, y_line),
                &paint,
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::renderer::model::*;
    use std::collections::HashMap;

    fn sample_project() -> NativeRenderProject {
        NativeRenderProject {
            width: 1080,
            height: 1920,
            fps: 30,
            duration: 4.0,
            scenes: vec![
                NativeScene {
                    id: "s1".into(),
                    text: "Hello World".into(),
                    duration: 2.0,
                    animation_style: AnimationStyle::Punch,
                    accent: "#FF3B30".into(),
                    active_word_count: 2,
                    offset_x: 0.0,
                    offset_y: 0.0,
                    word_colors: HashMap::new(),
                    image_layers: Vec::new(),
                    camera: None,
                    transition: None,
                    graphic_layers: Vec::new(),
                    video_layers: Vec::new(),
                },
                NativeScene {
                    id: "s2".into(),
                    text: "Second Scene".into(),
                    duration: 2.0,
                    animation_style: AnimationStyle::Karaoke,
                    accent: "#FFD60A".into(),
                    active_word_count: 1,
                    offset_x: 0.0,
                    offset_y: 0.0,
                    word_colors: HashMap::new(),
                    image_layers: Vec::new(),
                    camera: None,
                    transition: None,
                    graphic_layers: Vec::new(),
                    video_layers: Vec::new(),
                },
            ],
            font: NativeFontControls {
                family: "sans-serif".into(),
                weight: 900,
                size_scale: 1.0,
                uppercase: true,
                letter_spacing: 0.0,
                line_height: 1.08,
                stroke_width: 0.06,
                shadow_blur: 24.0,
                max_words_per_line: 4,
                text_align: TextAlign::Center,
                text_color: "#F4F2EA".into(),
                highlight_shape: HighlightShape::Pill,
                position: CaptionPosition::Center,
                text_color_mode: TextColorMode::Solid,
                gradient_from: String::new(),
                gradient_mid: String::new(),
                gradient_to: String::new(),
                gradient_direction: 0.0,
            },
            safe_area: SafeAreaPreset::Tiktok,
        }
    }

    #[test]
    fn test_active_scene_selection() {
        let project = sample_project();
        let (s, lt) = active_scene_at(&project.scenes, 0.5).unwrap();
        assert_eq!(s.id, "s1");
        assert!((lt - 0.5).abs() < 1e-9);

        let (s, lt) = active_scene_at(&project.scenes, 2.5).unwrap();
        assert_eq!(s.id, "s2");
        assert!((lt - 0.5).abs() < 1e-9);

        // Past the end → clamps to last scene
        let (s, _lt) = active_scene_at(&project.scenes, 10.0).unwrap();
        assert_eq!(s.id, "s2");
    }

    #[test]
    fn test_render_produces_png_bytes() {
        let project = sample_project();
        let png = render_frame_png(&project, 0.0).expect("render should succeed");
        // PNG magic bytes: 0x89 P N G
        assert!(png.len() > 100, "PNG should be non-trivial");
        assert_eq!(&png[0..4], &[0x89, 0x50, 0x4E, 0x47], "should start with PNG magic");
    }

    #[test]
    fn test_render_second_scene() {
        let project = sample_project();
        let png = render_frame_png(&project, 3.0).expect("render should succeed");
        assert!(png.len() > 100);
        assert_eq!(&png[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }

    #[test]
    fn test_parse_hex_colors() {
        let c = parse_hex_color("#FF0000");
        assert!((c.r - 1.0).abs() < 0.01);
        assert!(c.g.abs() < 0.01);

        let c2 = parse_hex_color("#00FF0080");
        assert!((c2.g - 1.0).abs() < 0.01);
        assert!((c2.a - 0.502).abs() < 0.01);

        let c3 = parse_hex_color("#F00");
        assert!((c3.r - 1.0).abs() < 0.01);
    }
}
