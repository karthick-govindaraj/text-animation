use super::animation::{ease_in_out, ease_out_cubic, linear};
use super::model::Keyframe;

/// Interpolated keyframe values at a given time.
#[derive(Debug, Clone)]
pub struct KeyframeValues {
    pub x: f64,
    pub y: f64,
    pub scale: f64,
    pub rotation: f64,
    pub opacity: f64,
    pub blur: f64,
    pub crop_x: f64,
    pub crop_y: f64,
    pub crop_w: f64,
    pub crop_h: f64,
}

impl Default for KeyframeValues {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            scale: 1.0,
            rotation: 0.0,
            opacity: 1.0,
            blur: 0.0,
            crop_x: 0.0,
            crop_y: 0.0,
            crop_w: 1.0,
            crop_h: 1.0,
        }
    }
}

/// Interpolate keyframes at a given local time.
/// If no keyframes, returns defaults. If one keyframe, returns its values.
/// Otherwise linearly interpolates between surrounding keyframes with easing.
pub fn interpolate_keyframes(keyframes: &[Keyframe], time: f64) -> KeyframeValues {
    if keyframes.is_empty() {
        return KeyframeValues::default();
    }

    // Sort by time (should already be sorted, but be safe)
    let mut sorted: Vec<&Keyframe> = keyframes.iter().collect();
    sorted.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));

    // Before first keyframe
    if time <= sorted[0].time {
        return keyframe_to_values(sorted[0]);
    }

    // After last keyframe
    if time >= sorted[sorted.len() - 1].time {
        return keyframe_to_values(sorted[sorted.len() - 1]);
    }

    // Find surrounding keyframes
    for i in 0..sorted.len() - 1 {
        let a = sorted[i];
        let b = sorted[i + 1];
        if time >= a.time && time <= b.time {
            let span = b.time - a.time;
            let raw_t = if span > 0.0 { (time - a.time) / span } else { 0.0 };
            let t = apply_easing(&b.easing, raw_t);
            return lerp_keyframes(a, b, t);
        }
    }

    KeyframeValues::default()
}

fn apply_easing(easing: &str, t: f64) -> f64 {
    match easing {
        "linear" => linear(t),
        "ease-out" | "ease-out-cubic" => ease_out_cubic(t),
        "ease-in-out" => ease_in_out(t),
        _ => ease_in_out(t),
    }
}

fn keyframe_to_values(kf: &Keyframe) -> KeyframeValues {
    KeyframeValues {
        x: kf.x.unwrap_or(0.0),
        y: kf.y.unwrap_or(0.0),
        scale: kf.scale.unwrap_or(1.0),
        rotation: kf.rotation.unwrap_or(0.0),
        opacity: kf.opacity.unwrap_or(1.0),
        blur: kf.blur.unwrap_or(0.0),
        crop_x: kf.crop_x.unwrap_or(0.0),
        crop_y: kf.crop_y.unwrap_or(0.0),
        crop_w: kf.crop_w.unwrap_or(1.0),
        crop_h: kf.crop_h.unwrap_or(1.0),
    }
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

fn lerp_opt(a: Option<f64>, b: Option<f64>, t: f64, default: f64) -> f64 {
    lerp(a.unwrap_or(default), b.unwrap_or(default), t)
}

fn lerp_keyframes(a: &Keyframe, b: &Keyframe, t: f64) -> KeyframeValues {
    KeyframeValues {
        x: lerp_opt(a.x, b.x, t, 0.0),
        y: lerp_opt(a.y, b.y, t, 0.0),
        scale: lerp_opt(a.scale, b.scale, t, 1.0),
        rotation: lerp_opt(a.rotation, b.rotation, t, 0.0),
        opacity: lerp_opt(a.opacity, b.opacity, t, 1.0),
        blur: lerp_opt(a.blur, b.blur, t, 0.0),
        crop_x: lerp_opt(a.crop_x, b.crop_x, t, 0.0),
        crop_y: lerp_opt(a.crop_y, b.crop_y, t, 0.0),
        crop_w: lerp_opt(a.crop_w, b.crop_w, t, 1.0),
        crop_h: lerp_opt(a.crop_h, b.crop_h, t, 1.0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kf(time: f64, x: Option<f64>, scale: Option<f64>, opacity: Option<f64>) -> Keyframe {
        Keyframe {
            time,
            x,
            y: None,
            scale,
            rotation: None,
            opacity,
            blur: None,
            crop_x: None,
            crop_y: None,
            crop_w: None,
            crop_h: None,
            easing: "linear".to_string(),
        }
    }

    #[test]
    fn test_empty_keyframes() {
        let v = interpolate_keyframes(&[], 1.0);
        assert!((v.x).abs() < 1e-6);
        assert!((v.scale - 1.0).abs() < 1e-6);
        assert!((v.opacity - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_single_keyframe() {
        let kfs = vec![kf(0.5, Some(100.0), Some(2.0), Some(0.5))];
        let v = interpolate_keyframes(&kfs, 0.5);
        assert!((v.x - 100.0).abs() < 1e-6);
        assert!((v.scale - 2.0).abs() < 1e-6);
    }

    #[test]
    fn test_before_first_keyframe() {
        let kfs = vec![kf(1.0, Some(50.0), None, None)];
        let v = interpolate_keyframes(&kfs, 0.0);
        assert!((v.x - 50.0).abs() < 1e-6);
    }

    #[test]
    fn test_after_last_keyframe() {
        let kfs = vec![kf(0.0, Some(0.0), None, None), kf(1.0, Some(100.0), None, None)];
        let v = interpolate_keyframes(&kfs, 2.0);
        assert!((v.x - 100.0).abs() < 1e-6);
    }

    #[test]
    fn test_linear_interpolation_midpoint() {
        let kfs = vec![
            kf(0.0, Some(0.0), Some(1.0), Some(0.0)),
            kf(1.0, Some(100.0), Some(2.0), Some(1.0)),
        ];
        let v = interpolate_keyframes(&kfs, 0.5);
        assert!((v.x - 50.0).abs() < 1e-6);
        assert!((v.scale - 1.5).abs() < 1e-6);
        assert!((v.opacity - 0.5).abs() < 1e-6);
    }

    #[test]
    fn test_three_keyframes() {
        let kfs = vec![
            kf(0.0, Some(0.0), None, None),
            kf(1.0, Some(100.0), None, None),
            kf(2.0, Some(50.0), None, None),
        ];
        let v1 = interpolate_keyframes(&kfs, 0.5);
        assert!((v1.x - 50.0).abs() < 1e-6);
        let v2 = interpolate_keyframes(&kfs, 1.5);
        assert!((v2.x - 75.0).abs() < 1e-6);
    }

    #[test]
    fn test_eased_interpolation() {
        let kfs = vec![
            Keyframe {
                time: 0.0, x: Some(0.0), y: None, scale: None, rotation: None,
                opacity: None, blur: None, crop_x: None, crop_y: None,
                crop_w: None, crop_h: None, easing: "linear".to_string(),
            },
            Keyframe {
                time: 1.0, x: Some(100.0), y: None, scale: None, rotation: None,
                opacity: None, blur: None, crop_x: None, crop_y: None,
                crop_w: None, crop_h: None, easing: "ease-in-out".to_string(),
            },
        ];
        let v = interpolate_keyframes(&kfs, 0.5);
        // ease_in_out(0.5) = 0.5, so still 50
        assert!((v.x - 50.0).abs() < 1e-6);
    }
}
