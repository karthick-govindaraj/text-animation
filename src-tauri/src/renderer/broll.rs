use skia_safe::{
    BlurStyle, Canvas, Color4f, Image, MaskFilter, Paint, PaintStyle, Rect,
};
use std::cell::RefCell;
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::time::Duration;

use super::animation::ease_in_out;
use super::model::{CameraMotion, ImageEffect, ImageFit, ImageLayer, SceneTransition, TransitionType};

thread_local! {
    static IMAGE_CACHE: RefCell<HashMap<String, Option<Image>>> = RefCell::new(HashMap::new());
}

// ─── Image Fit ───

/// Compute source and destination rects for fitting an image into a canvas.
pub fn compute_fit_rects(
    img_w: f32,
    img_h: f32,
    canvas_w: f32,
    canvas_h: f32,
    fit: &ImageFit,
    crop: &super::model::CropRect,
) -> (Rect, Rect) {
    // Apply crop to source
    let src = Rect::from_xywh(
        img_w * crop.x as f32,
        img_h * crop.y as f32,
        img_w * crop.width as f32,
        img_h * crop.height as f32,
    );

    let src_aspect = src.width() / src.height();
    let canvas_aspect = canvas_w / canvas_h;

    let dst = match fit {
        ImageFit::Stretch => Rect::from_wh(canvas_w, canvas_h),
        ImageFit::Cover => {
            if src_aspect > canvas_aspect {
                // Image wider → scale by height, center horizontally
                let scale = canvas_h / src.height();
                let w = src.width() * scale;
                Rect::from_xywh(-(w - canvas_w) * 0.5, 0.0, w, canvas_h)
            } else {
                let scale = canvas_w / src.width();
                let h = src.height() * scale;
                Rect::from_xywh(0.0, -(h - canvas_h) * 0.5, canvas_w, h)
            }
        }
        ImageFit::Contain => {
            if src_aspect > canvas_aspect {
                let scale = canvas_w / src.width();
                let h = src.height() * scale;
                Rect::from_xywh(0.0, (canvas_h - h) * 0.5, canvas_w, h)
            } else {
                let scale = canvas_h / src.height();
                let w = src.width() * scale;
                Rect::from_xywh((canvas_w - w) * 0.5, 0.0, w, canvas_h)
            }
        }
    };

    (src, dst)
}

// ─── Fallback selection ───

/// Try to load an image from the primary path, then fallbacks.
pub fn load_image_with_fallback(primary: &str, fallbacks: &[String]) -> Option<Image> {
    let candidates = std::iter::once(primary).chain(fallbacks.iter().map(|s| s.as_str()));
    for path in candidates {
        if let Some(img) = load_image_file(path) {
            return Some(img);
        }
    }
    None
}

fn load_image_file(path: &str) -> Option<Image> {
    if path.trim().is_empty() {
        return None;
    }

    if let Some(cached) = IMAGE_CACHE.with(|cache| cache.borrow().get(path).cloned()) {
        return cached;
    }

    let data = read_image_bytes(path);
    let image = data.and_then(|bytes| {
        let sk_data = skia_safe::Data::new_copy(&bytes);
        Image::from_encoded(sk_data)
    });

    IMAGE_CACHE.with(|cache| {
        cache.borrow_mut().insert(path.to_string(), image.clone());
    });
    image
}

fn read_image_bytes(path: &str) -> Option<Vec<u8>> {
    if path.starts_with("http://") || path.starts_with("https://") {
        let response = ureq::get(path)
            .timeout(Duration::from_secs(20))
            .call()
            .ok()?;
        let mut reader = response.into_reader().take(25 * 1024 * 1024);
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).ok()?;
        return Some(bytes);
    }

    let p = Path::new(path);
    if !p.exists() {
        return None;
    }
    std::fs::read(p).ok()
}

// ─── Camera interpolation ───

/// Interpolate camera motion at a given progress (0..1).
pub fn interpolate_camera(camera: &CameraMotion, progress: f64) -> (f64, f64, f64) {
    let t = match camera.easing.as_str() {
        "linear" => progress,
        _ => ease_in_out(progress),
    };
    let zoom = camera.zoom_from + (camera.zoom_to - camera.zoom_from) * t;
    let pan_x = camera.pan_x_from + (camera.pan_x_to - camera.pan_x_from) * t;
    let pan_y = camera.pan_y_from + (camera.pan_y_to - camera.pan_y_from) * t;
    (zoom, pan_x, pan_y)
}

/// Apply camera transform to canvas (around center).
pub fn apply_camera_transform(
    canvas: &Canvas,
    camera: &CameraMotion,
    progress: f64,
    canvas_w: f32,
    canvas_h: f32,
) {
    let (zoom, pan_x, pan_y) = interpolate_camera(camera, progress);
    let cx = canvas_w as f64 * 0.5;
    let cy = canvas_h as f64 * 0.5;
    canvas.translate((cx as f32, cy as f32));
    canvas.scale((zoom as f32, zoom as f32));
    canvas.translate((-(cx + pan_x * canvas_w as f64) as f32, -(cy + pan_y * canvas_h as f64) as f32));
}

// ─── Scene Transitions ───

/// Compute transition progress (0 = no transition, 1 = fully in transition).
/// Only applies at the start of a scene.
pub fn transition_progress(local_time: f64, transition: &SceneTransition) -> f64 {
    if transition.duration <= 0.0 {
        return 0.0;
    }
    1.0 - (local_time / transition.duration).clamp(0.0, 1.0)
}

/// Apply transition effect to the canvas. Called before drawing scene content.
/// `progress` is 1.0 at start of transition, 0.0 when complete.
pub fn apply_transition(
    canvas: &Canvas,
    transition: &SceneTransition,
    progress: f64,
    canvas_w: f32,
    canvas_h: f32,
) {
    if progress <= 0.0 {
        return;
    }
    let p = progress as f32;
    match transition.transition_type {
        TransitionType::Cut => {} // No effect
        TransitionType::Fade => {
            // Draw a black overlay that fades out
            let mut paint = Paint::default();
            paint.set_color4f(Color4f::new(0.0, 0.0, 0.0, p), None);
            paint.set_style(PaintStyle::Fill);
            canvas.draw_rect(Rect::from_wh(canvas_w, canvas_h), &paint);
        }
        TransitionType::Zoom => {
            let scale = 1.0 + p * 0.3;
            let cx = canvas_w * 0.5;
            let cy = canvas_h * 0.5;
            canvas.translate((cx, cy));
            canvas.scale((scale, scale));
            canvas.translate((-cx, -cy));
        }
        TransitionType::Slide => {
            canvas.translate((-canvas_w * p, 0.0));
        }
        TransitionType::Blur => {
            // Apply a blur overlay approximation
            let mut paint = Paint::default();
            paint.set_color4f(Color4f::new(0.0, 0.0, 0.0, p * 0.5), None);
            paint.set_style(PaintStyle::Fill);
            paint.set_mask_filter(MaskFilter::blur(BlurStyle::Normal, p * 20.0, false));
            canvas.draw_rect(Rect::from_wh(canvas_w, canvas_h), &paint);
        }
        TransitionType::Flash => {
            let mut paint = Paint::default();
            paint.set_color4f(Color4f::new(1.0, 1.0, 1.0, p), None);
            paint.set_style(PaintStyle::Fill);
            canvas.draw_rect(Rect::from_wh(canvas_w, canvas_h), &paint);
        }
        TransitionType::Glitch => {
            // Glitch approximation: horizontal offset bands
            let bands = 6;
            let band_h = canvas_h / bands as f32;
            for i in 0..bands {
                let offset = ((i as f32 * 13.7).sin() * canvas_w * 0.08 * p) as f32;
                let y = i as f32 * band_h;
                canvas.save();
                canvas.clip_rect(Rect::from_xywh(0.0, y, canvas_w, band_h), None, false);
                canvas.translate((offset, 0.0));
                canvas.restore();
            }
        }
    }
}

// ─── Image effect helpers ───

fn effect_alpha(effect: &ImageEffect, progress: f64) -> f64 {
    match effect {
        ImageEffect::FadeIn => progress.clamp(0.0, 1.0),
        ImageEffect::FadeOut => (1.0 - progress).clamp(0.0, 1.0),
        _ => 1.0,
    }
}

fn effect_offset(effect: &ImageEffect, progress: f64, canvas_w: f32, canvas_h: f32) -> (f32, f32) {
    let p = (1.0 - progress.clamp(0.0, 1.0)) as f32;
    match effect {
        ImageEffect::SlideLeft => (-canvas_w * p, 0.0),
        ImageEffect::SlideRight => (canvas_w * p, 0.0),
        ImageEffect::SlideUp => (0.0, -canvas_h * p),
        ImageEffect::SlideDown => (0.0, canvas_h * p),
        _ => (0.0, 0.0),
    }
}

fn effect_scale(effect: &ImageEffect, progress: f64) -> f32 {
    let p = progress.clamp(0.0, 1.0) as f32;
    match effect {
        ImageEffect::ZoomIn => 0.6 + 0.4 * p,
        ImageEffect::ZoomOut => 1.4 - 0.4 * p,
        _ => 1.0,
    }
}

// ─── Render image layers ───

/// Render all image layers for a scene behind the captions.
pub fn render_image_layers(
    canvas: &Canvas,
    layers: &[ImageLayer],
    local_time: f64,
    scene_duration: f64,
    canvas_w: f32,
    canvas_h: f32,
) {
    // Sort by z_index
    let mut sorted: Vec<&ImageLayer> = layers.iter().collect();
    sorted.sort_by_key(|l| l.z_index);

    for layer in sorted {
        let end = if layer.end <= 0.0 { scene_duration } else { layer.end };
        // Skip if outside time window
        if local_time < layer.start || local_time > end {
            continue;
        }

        let img = match load_image_with_fallback(&layer.path, &layer.fallbacks) {
            Some(img) => img,
            None => continue,
        };

        let img_w = img.width() as f32;
        let img_h = img.height() as f32;
        let (src_rect, dst_rect) = compute_fit_rects(
            img_w, img_h, canvas_w, canvas_h, &layer.fit, &layer.crop,
        );

        canvas.save();

        // Entrance effect
        let layer_duration = end - layer.start;
        let entrance_dur = 0.3_f64.min(layer_duration * 0.3);
        let entrance_progress = ((local_time - layer.start) / entrance_dur).clamp(0.0, 1.0);
        let entrance_alpha = effect_alpha(&layer.entrance, entrance_progress);
        let (ent_dx, ent_dy) = effect_offset(&layer.entrance, entrance_progress, canvas_w, canvas_h);
        let ent_scale = effect_scale(&layer.entrance, entrance_progress);

        // Exit effect
        let exit_dur = 0.3_f64.min(layer_duration * 0.3);
        let time_to_end = end - local_time;
        let exit_progress = (time_to_end / exit_dur).clamp(0.0, 1.0);
        let exit_alpha = effect_alpha(&layer.exit, 1.0 - exit_progress);

        let alpha = (layer.opacity * entrance_alpha * exit_alpha).clamp(0.0, 1.0) as f32;

        // Apply entrance offset
        canvas.translate((ent_dx, ent_dy));

        // Apply entrance scale
        if (ent_scale - 1.0).abs() > 0.001 {
            let cx = canvas_w * 0.5;
            let cy = canvas_h * 0.5;
            canvas.translate((cx, cy));
            canvas.scale((ent_scale, ent_scale));
            canvas.translate((-cx, -cy));
        }

        // Draw image
        let mut paint = Paint::default();
        paint.set_anti_alias(true);
        paint.set_alpha_f(alpha);

        if layer.blur > 0.5 {
            paint.set_mask_filter(MaskFilter::blur(
                BlurStyle::Normal,
                layer.blur as f32 * 0.5,
                false,
            ));
        }

        canvas.draw_image_rect(img, Some((&src_rect, skia_safe::canvas::SrcRectConstraint::Fast)), dst_rect, &paint);

        // Darken overlay
        if layer.darken > 0.01 {
            let mut dark = Paint::default();
            dark.set_color4f(Color4f::new(0.0, 0.0, 0.0, layer.darken as f32), None);
            dark.set_style(PaintStyle::Fill);
            canvas.draw_rect(Rect::from_wh(canvas_w, canvas_h), &dark);
        }

        // Vignette (radial gradient approximation)
        if layer.vignette > 0.01 {
            let cx = canvas_w * 0.5;
            let cy = canvas_h * 0.5;
            let radius = (cx * cx + cy * cy).sqrt();
            // Draw concentric dark rings
            for ring in 0..5 {
                let r = radius * (0.5 + ring as f32 * 0.1);
                let a = layer.vignette as f32 * (ring as f32 + 1.0) * 0.06;
                let mut v_paint = Paint::default();
                v_paint.set_color4f(Color4f::new(0.0, 0.0, 0.0, a.min(0.6)), None);
                v_paint.set_style(PaintStyle::Stroke);
                v_paint.set_stroke_width(radius * 0.15);
                v_paint.set_anti_alias(true);
                canvas.draw_circle((cx, cy), r, &v_paint);
            }
        }

        canvas.restore();
    }
}

// ─── Tests ───

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::model::CropRect;

    #[test]
    fn test_cover_fit_landscape_image() {
        let (src, dst) = compute_fit_rects(
            1920.0, 1080.0, 1080.0, 1920.0,
            &ImageFit::Cover, &CropRect::default(),
        );
        assert!((src.width() - 1920.0).abs() < 1.0);
        // Cover should scale to fill: dst height = canvas height
        assert!((dst.height() - 1920.0).abs() < 1.0);
        // Width should be larger than canvas
        assert!(dst.width() > 1080.0);
    }

    #[test]
    fn test_contain_fit() {
        let (_, dst) = compute_fit_rects(
            1920.0, 1080.0, 1080.0, 1920.0,
            &ImageFit::Contain, &CropRect::default(),
        );
        // Contain: image fits entirely within canvas
        assert!(dst.width() <= 1080.1);
        assert!(dst.height() <= 1920.1);
    }

    #[test]
    fn test_stretch_fit() {
        let (_, dst) = compute_fit_rects(
            800.0, 600.0, 1080.0, 1920.0,
            &ImageFit::Stretch, &CropRect::default(),
        );
        assert!((dst.width() - 1080.0).abs() < 1.0);
        assert!((dst.height() - 1920.0).abs() < 1.0);
    }

    #[test]
    fn test_crop_source_rect() {
        let crop = CropRect { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
        let (src, _) = compute_fit_rects(
            1000.0, 1000.0, 500.0, 500.0,
            &ImageFit::Cover, &crop,
        );
        assert!((src.left() - 250.0).abs() < 1.0);
        assert!((src.top() - 250.0).abs() < 1.0);
        assert!((src.width() - 500.0).abs() < 1.0);
    }

    #[test]
    fn test_fallback_selection_no_files() {
        let result = load_image_with_fallback("/nonexistent/image.png", &[
            "/also/nonexistent.jpg".to_string(),
        ]);
        assert!(result.is_none());
    }

    #[test]
    fn test_camera_interpolation_start() {
        let cam = CameraMotion {
            zoom_from: 1.0,
            zoom_to: 1.5,
            pan_x_from: 0.0,
            pan_x_to: 0.1,
            pan_y_from: 0.0,
            pan_y_to: -0.05,
            easing: "linear".to_string(),
        };
        let (zoom, px, py) = interpolate_camera(&cam, 0.0);
        assert!((zoom - 1.0).abs() < 1e-6);
        assert!(px.abs() < 1e-6);
        assert!(py.abs() < 1e-6);
    }

    #[test]
    fn test_camera_interpolation_end() {
        let cam = CameraMotion {
            zoom_from: 1.0,
            zoom_to: 1.5,
            pan_x_from: 0.0,
            pan_x_to: 0.1,
            pan_y_from: 0.0,
            pan_y_to: -0.05,
            easing: "linear".to_string(),
        };
        let (zoom, px, py) = interpolate_camera(&cam, 1.0);
        assert!((zoom - 1.5).abs() < 1e-6);
        assert!((px - 0.1).abs() < 1e-6);
        assert!((py + 0.05).abs() < 1e-6);
    }

    #[test]
    fn test_camera_interpolation_mid_eased() {
        let cam = CameraMotion {
            zoom_from: 1.0,
            zoom_to: 2.0,
            pan_x_from: 0.0,
            pan_x_to: 0.0,
            pan_y_from: 0.0,
            pan_y_to: 0.0,
            easing: "ease-in-out".to_string(),
        };
        let (zoom, _, _) = interpolate_camera(&cam, 0.5);
        // ease_in_out(0.5) = 0.5
        assert!((zoom - 1.5).abs() < 0.01);
    }

    #[test]
    fn test_transition_progress_values() {
        let t = SceneTransition {
            transition_type: TransitionType::Fade,
            duration: 0.5,
        };
        assert!((transition_progress(0.0, &t) - 1.0).abs() < 1e-6);
        assert!((transition_progress(0.25, &t) - 0.5).abs() < 1e-6);
        assert!((transition_progress(0.5, &t)).abs() < 1e-6);
        assert!((transition_progress(1.0, &t)).abs() < 1e-6);
    }

    #[test]
    fn test_transition_progress_cut() {
        let t = SceneTransition {
            transition_type: TransitionType::Cut,
            duration: 0.0,
        };
        assert!((transition_progress(0.0, &t)).abs() < 1e-6);
    }
}
