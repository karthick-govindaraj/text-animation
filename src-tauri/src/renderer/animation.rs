use super::model::AnimationStyle;

/// Per-word transform produced by the animation engine.
#[derive(Debug, Clone, Copy)]
pub struct WordTransform {
    pub alpha: f64,
    pub x: f64,
    pub y: f64,
    pub scale: f64,
    pub rotation: f64,
    pub skew_x: f64,
}

impl Default for WordTransform {
    fn default() -> Self {
        Self {
            alpha: 1.0,
            x: 0.0,
            y: 0.0,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        }
    }
}

// ─── Easing helpers ───

fn clamp01(t: f64) -> f64 {
    t.clamp(0.0, 1.0)
}

pub fn ease_out_cubic(t: f64) -> f64 {
    let t = clamp01(t);
    1.0 - (1.0 - t).powi(3)
}

pub fn ease_in_out(t: f64) -> f64 {
    let t = clamp01(t);
    if t < 0.5 {
        4.0 * t * t * t
    } else {
        1.0 - (-2.0 * t + 2.0).powi(3) / 2.0
    }
}

pub fn ease_out_back(t: f64) -> f64 {
    let t = clamp01(t);
    let x = t - 1.0;
    1.0 + 2.4 * x * x * x + 1.4 * x * x
}

pub fn linear(t: f64) -> f64 {
    clamp01(t)
}

/// Spring/elastic approximation — decaying oscillation.
pub fn spring_elastic(t: f64) -> f64 {
    let t = clamp01(t);
    if t == 0.0 || t == 1.0 {
        return t;
    }
    let decay = (-6.0 * t).exp();
    1.0 - decay * (std::f64::consts::PI * 2.0 * t * 3.0).cos()
}

// ─── Timing helpers ───

/// Word timing window: when the word starts animating and when it finishes.
#[derive(Debug, Clone, Copy)]
pub struct WordTiming {
    pub start: f64,
    pub end: f64,
}

/// Compute word timing mirroring the frontend `getWordTiming`.
pub fn get_word_timing(scene_duration: f64, word_count: usize, source_index: usize) -> WordTiming {
    let readable = (scene_duration * 0.84).max(0.6);
    let step = readable / word_count.max(1) as f64;
    let start = 0.16 + source_index as f64 * step;
    let end = start + step.max(0.36) * 1.9;
    WordTiming { start, end }
}

/// Convert a global project time to (scene_index, local_time).
pub fn global_to_scene(scene_durations: &[f64], time: f64) -> (usize, f64) {
    let mut cursor = 0.0;
    for (i, &dur) in scene_durations.iter().enumerate() {
        let end = cursor + dur;
        if time < end || i == scene_durations.len() - 1 {
            return (i, (time - cursor).max(0.0));
        }
        cursor = end;
    }
    (0, 0.0)
}

/// Scene progress (0..1).
pub fn scene_progress(local_time: f64, scene_duration: f64) -> f64 {
    if scene_duration <= 0.0 {
        return 0.0;
    }
    (local_time / scene_duration).clamp(0.0, 1.0)
}

// ─── Core animation ───

/// Compute the base animation intro/outro values.
struct AnimBase {
    intro: f64,
    outro: f64,
    active_pulse: f64,
}

fn anim_base(local_time: f64, scene_duration: f64, word_start: f64, active: bool) -> AnimBase {
    let intro = ease_out_cubic((local_time - word_start) / 0.32);
    let outro = 1.0 - ease_in_out((local_time - (scene_duration - 0.42)) / 0.36);
    let active_pulse = if active {
        ((local_time - word_start) * std::f64::consts::PI * 4.2).sin()
    } else {
        0.0
    };
    AnimBase { intro, outro, active_pulse }
}

/// Compute per-word animation transform for a given animation style.
///
/// Parameters mirror the frontend's `getStyleTransform`:
/// - `local_time`: seconds within the current scene
/// - `scene_duration`: total scene duration
/// - `word_start`: the word's start time (from `get_word_timing`)
/// - `source_index`, `line`: the word's position in the text
/// - `word_x`: the word's base X position on canvas
/// - `word_y`: the word's base Y position on canvas
/// - `font_size`: current font size
/// - `active`: whether the word is in the active word group
/// - `canvas_width`: width of the rendering canvas
/// - `style`: the animation style to apply
pub fn get_style_transform(
    style: &AnimationStyle,
    local_time: f64,
    scene_duration: f64,
    word_start: f64,
    source_index: usize,
    line: usize,
    word_x: f64,
    word_y: f64,
    font_size: f64,
    active: bool,
    canvas_width: f64,
) -> WordTransform {
    let base = anim_base(local_time, scene_duration, word_start, active);
    let intro = base.intro;
    let outro = base.outro;
    let pulse = base.active_pulse;

    match style {
        AnimationStyle::Punch => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * 24.0,
            scale: 0.96 + intro * 0.04 + if active { pulse * 0.035 } else { 0.0 },
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::Cascade => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * (font_size * 0.9 + line as f64 * 18.0),
            scale: 1.0,
            rotation: (1.0 - intro) * -0.05,
            skew_x: 0.0,
        },
        AnimationStyle::Typewriter | AnimationStyle::CleanSubtitle => WordTransform {
            alpha: clamp01((local_time - word_start) / 0.22) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::Drift => {
            let t = local_time;
            WordTransform {
                alpha: clamp01(intro) * clamp01(outro),
                x: word_x + (t * 1.4 + line as f64).sin() * 8.0 + (1.0 - intro) * -30.0,
                y: word_y + (t * 1.1 + word_x * 0.01).cos() * 5.0,
                scale: 1.0,
                rotation: 0.0,
                skew_x: 0.0,
            }
        }
        AnimationStyle::TiktokBounce => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * 42.0,
            scale: 0.84 + ease_out_back((local_time - word_start) / 0.34) * 0.18,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::ShortsPop => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * 22.0,
            scale: 0.72 + intro * 0.28 + if active { 0.08 } else { 0.0 },
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::Karaoke => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: if active { 1.04 } else { 1.0 },
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::Glitch => {
            let jitter =
                ((local_time + source_index as f64) * 80.0).sin() * font_size * 0.05;
            WordTransform {
                alpha: clamp01(intro) * clamp01(outro),
                x: word_x + jitter,
                y: word_y - jitter * 0.4,
                scale: 1.0,
                rotation: 0.0,
                skew_x: jitter * 0.004,
            }
        }
        AnimationStyle::LowerThird => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x - (1.0 - intro) * canvas_width * 0.08,
            y: word_y,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::WordZoom => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: 0.45 + ease_out_back((local_time - word_start) / 0.34) * 0.58,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::CaptionStack => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * 24.0,
            scale: if active { 1.08 } else { 0.96 },
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::NeonFlicker => {
            let flicker = if active {
                0.82 + ((local_time * 34.0 + source_index as f64).sin().abs()) * 0.18
            } else {
                1.0
            };
            WordTransform {
                alpha: clamp01(intro) * clamp01(outro) * flicker,
                x: word_x,
                y: word_y,
                scale: if active { 1.04 } else { 1.0 },
                rotation: 0.0,
                skew_x: 0.0,
            }
        }
        AnimationStyle::MinimalFade => WordTransform {
            alpha: clamp01((local_time - word_start) / 0.5) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::Stomp => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y - (1.0 - intro) * 18.0,
            scale: 1.28 - intro * 0.28 + if active { pulse * 0.025 } else { 0.0 },
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::ElasticPop => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: 0.4 + ease_out_back((local_time - word_start) / 0.42) * 0.66,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::NewsTicker => {
            let progress = local_time / scene_duration.max(0.1);
            WordTransform {
                alpha: clamp01(outro),
                x: word_x + canvas_width * (1.0 - progress) - canvas_width * 0.2,
                y: word_y,
                scale: 1.0,
                rotation: 0.0,
                skew_x: 0.0,
            }
        }
        AnimationStyle::ComicPop => WordTransform {
            alpha: clamp01(intro) * clamp01(outro),
            x: word_x,
            y: word_y,
            scale: 0.78 + intro * 0.25,
            rotation: if active {
                -0.04 + pulse * 0.025
            } else {
                -0.025
            },
            skew_x: 0.0,
        },
        AnimationStyle::LuxuryTitle => WordTransform {
            alpha: clamp01((local_time - word_start) / 0.7) * clamp01(outro),
            x: word_x,
            y: word_y + (1.0 - intro) * 12.0,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        },
        AnimationStyle::TechHud => WordTransform {
            alpha: clamp01((local_time - word_start) / 0.2) * clamp01(outro),
            x: word_x + (1.0 - intro) * -18.0,
            y: word_y,
            scale: 1.0,
            rotation: 0.0,
            skew_x: 0.0,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_easing_boundaries() {
        assert!((ease_out_cubic(0.0)).abs() < 1e-9);
        assert!((ease_out_cubic(1.0) - 1.0).abs() < 1e-9);
        assert!((ease_in_out(0.0)).abs() < 1e-9);
        assert!((ease_in_out(1.0) - 1.0).abs() < 1e-9);
        assert!((ease_out_back(0.0)).abs() < 1e-9);
        assert!((ease_out_back(1.0) - 1.0).abs() < 1e-9);
        assert!((linear(0.0)).abs() < 1e-9);
        assert!((linear(1.0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_scene_timing() {
        let durations = vec![2.0, 3.0, 1.5];
        assert_eq!(global_to_scene(&durations, 0.5), (0, 0.5));
        assert_eq!(global_to_scene(&durations, 2.5), (1, 0.5));
        assert_eq!(global_to_scene(&durations, 5.5), (2, 0.5));
        // Past end clamps to last scene
        let (idx, _lt) = global_to_scene(&durations, 100.0);
        assert_eq!(idx, 2);
    }

    #[test]
    fn test_word_timing() {
        let wt = get_word_timing(3.0, 5, 0);
        assert!((wt.start - 0.16).abs() < 1e-9);
        assert!(wt.end > wt.start);
        let wt2 = get_word_timing(3.0, 5, 4);
        assert!(wt2.start > wt.start);
    }

    #[test]
    fn test_punch_transform_start() {
        let t = get_style_transform(
            &AnimationStyle::Punch, 0.0, 3.0, 0.16, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        // At time 0, word hasn't started yet (start=0.16), so intro≈0, should be
        // mostly invisible and displaced
        assert!(t.alpha < 0.3, "should be fading in at t=0");
        assert!(t.y > 500.0, "should be displaced downward");
    }

    #[test]
    fn test_punch_transform_mid() {
        let t = get_style_transform(
            &AnimationStyle::Punch, 1.0, 3.0, 0.16, 0, 0, 100.0, 500.0, 80.0, true, 1080.0,
        );
        // Well after intro, should be fully visible and near base position
        assert!(t.alpha > 0.8);
        assert!((t.y - 500.0).abs() < 5.0);
        assert!(t.scale > 0.9 && t.scale < 1.15);
    }

    #[test]
    fn test_typewriter_reveal() {
        // Before word start
        let t0 = get_style_transform(
            &AnimationStyle::Typewriter, 0.0, 3.0, 0.5, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        assert!(t0.alpha < 0.01, "should be invisible before word starts");

        // After word start
        let t1 = get_style_transform(
            &AnimationStyle::Typewriter, 1.0, 3.0, 0.5, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        assert!(t1.alpha > 0.8, "should be visible after word starts");
        assert!((t1.x - 100.0).abs() < 1e-6, "x should not change");
        assert!((t1.y - 500.0).abs() < 1e-6, "y should not change");
    }

    #[test]
    fn test_news_ticker_motion() {
        let t0 = get_style_transform(
            &AnimationStyle::NewsTicker, 0.0, 3.0, 0.16, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        let t1 = get_style_transform(
            &AnimationStyle::NewsTicker, 1.5, 3.0, 0.16, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        let t2 = get_style_transform(
            &AnimationStyle::NewsTicker, 2.9, 3.0, 0.16, 0, 0, 100.0, 500.0, 80.0, false, 1080.0,
        );
        // Should scroll from right to left over time
        assert!(t0.x > t1.x, "should move leftward over time");
        assert!(t1.x > t2.x, "should continue moving leftward");
    }

    #[test]
    fn test_spring_elastic() {
        assert!((spring_elastic(0.0)).abs() < 1e-9);
        assert!((spring_elastic(1.0) - 1.0).abs() < 0.01);
        // Should overshoot at some point
        let vals: Vec<f64> = (0..100).map(|i| spring_elastic(i as f64 / 100.0)).collect();
        assert!(vals.iter().any(|&v| v > 1.0), "spring should overshoot");
    }

    #[test]
    fn test_scene_progress() {
        assert!((scene_progress(0.0, 3.0)).abs() < 1e-9);
        assert!((scene_progress(1.5, 3.0) - 0.5).abs() < 1e-9);
        assert!((scene_progress(3.0, 3.0) - 1.0).abs() < 1e-9);
    }
}
