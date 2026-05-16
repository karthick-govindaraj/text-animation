use super::model::{
    AnimationStyle, CaptionPosition, NativeFontControls, NativeRenderProject,
    NativeScene, SafeAreaPreset, TextAlign,
};

/// Safe-area bounds as fractions of canvas dimensions.
#[derive(Debug, Clone, Copy)]
pub struct SafeBounds {
    pub left: f64,
    pub right: f64,
    pub top: f64,
    pub bottom: f64,
}

pub fn get_safe_bounds(preset: &SafeAreaPreset) -> SafeBounds {
    match preset {
        SafeAreaPreset::Tiktok => SafeBounds { left: 0.08, right: 0.20, top: 0.11, bottom: 0.22 },
        SafeAreaPreset::Reels  => SafeBounds { left: 0.08, right: 0.12, top: 0.12, bottom: 0.18 },
        SafeAreaPreset::Shorts => SafeBounds { left: 0.08, right: 0.16, top: 0.12, bottom: 0.20 },
        SafeAreaPreset::None   => SafeBounds { left: 0.08, right: 0.08, top: 0.12, bottom: 0.12 },
    }
}

/// A word token with caption-engine metadata.
#[derive(Debug, Clone)]
pub struct CaptionWord {
    pub value: String,
    pub source_index: usize,
    pub line: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub active: bool,
    pub color: Option<String>,
}

/// Result of the caption layout for a scene at a given time.
#[derive(Debug, Clone)]
pub struct CaptionLayout {
    pub scene_id: String,
    pub words: Vec<CaptionWord>,
    pub font_size: f64,
    pub line_count: usize,
}

/// Compute the active word index using the same algorithm as the frontend.
/// Returns the start index of the active word group.
pub fn get_active_word_index(
    scene: &NativeScene,
    word_count: usize,
    local_time: f64,
) -> usize {
    if word_count == 0 {
        return 0;
    }
    let readable_duration = (scene.duration * 0.84).max(0.6);
    let step = readable_duration / word_count.max(1) as f64;
    let active_word_count = (scene.active_word_count as usize).clamp(1, 8);
    let raw_index = ((local_time - 0.16) / step).floor().clamp(0.0, (word_count - 1) as f64) as usize;
    let group_start = (raw_index / active_word_count) * active_word_count;
    group_start.min(word_count.saturating_sub(1))
}

/// Compute font size using the same heuristic as the frontend.
pub fn compute_font_size(
    font: &NativeFontControls,
    canvas_width: u32,
    canvas_height: u32,
    word_count: usize,
) -> f64 {
    let density = if word_count > 18 {
        0.064
    } else if word_count > 8 {
        0.074
    } else {
        0.088
    };
    let shortest_side = canvas_width.min(canvas_height) as f64;
    (shortest_side * density * font.size_scale).clamp(34.0, 154.0).round()
}

/// Compute the Y position of the first line based on caption position and safe area.
fn get_position_y(
    project: &NativeRenderProject,
    scene: &NativeScene,
    line_count: usize,
    line_height: f64,
) -> f64 {
    let safe = get_safe_bounds(&project.safe_area);
    let h = project.height as f64;
    let content_height = (line_count as f64 - 1.0).max(0.0) * line_height;
    let upper = h * safe.top + content_height / 2.0 + line_height * 0.7;
    let lower = h * (1.0 - safe.bottom) - content_height / 2.0 - line_height * 0.7;
    let center = h * 0.5 - content_height / 2.0;

    match scene.animation_style {
        AnimationStyle::LowerThird | AnimationStyle::NewsTicker => lower - content_height / 2.0,
        _ => match project.font.position {
            CaptionPosition::Upper => upper,
            CaptionPosition::Lower | CaptionPosition::SafeLower => lower - content_height / 2.0,
            CaptionPosition::Center => center,
        },
    }
}

/// Full caption layout: splits text, groups into lines, resolves active words,
/// assigns per-word colors, and positions with safe-area and alignment.
pub fn compute_caption_layout(
    project: &NativeRenderProject,
    scene: &NativeScene,
    local_time: f64,
) -> CaptionLayout {
    let raw_text = if project.font.uppercase {
        scene.text.to_uppercase()
    } else {
        scene.text.clone()
    };

    let words: Vec<&str> = raw_text.split_whitespace().collect();
    let word_count = words.len();
    let active_word_count = (scene.active_word_count as usize).clamp(1, 8);
    let active_index = get_active_word_index(scene, word_count, local_time);
    let active_end = (active_index + active_word_count).min(word_count);

    let font_size = compute_font_size(&project.font, project.width, project.height, word_count);
    let char_factor = 0.6;
    let gap = font_size * 0.26;
    let line_height = font_size * project.font.line_height;
    let safe = get_safe_bounds(&project.safe_area);
    let max_width = match scene.animation_style {
        AnimationStyle::LowerThird | AnimationStyle::NewsTicker => {
            project.width as f64 * (1.0 - safe.left - safe.right) * 0.84
        }
        _ => project.width as f64 * (1.0 - safe.left - safe.right),
    };
    let max_per_line = (project.font.max_words_per_line as usize).max(1);
    let offset_x = (scene.offset_x / 100.0) * project.width as f64;
    let offset_y = (scene.offset_y / 100.0) * project.height as f64;

    // Estimate word widths
    let word_widths: Vec<f64> = words
        .iter()
        .map(|w| {
            w.len() as f64 * font_size * char_factor
                + project.font.letter_spacing * (w.len() as f64)
        })
        .collect();

    // Group into lines by width and max_per_line
    let mut line_groups: Vec<Vec<usize>> = Vec::new();
    let mut current_line: Vec<usize> = Vec::new();
    let mut current_width: f64 = 0.0;

    for (i, &ww) in word_widths.iter().enumerate() {
        let projected = current_width + if current_line.is_empty() { 0.0 } else { gap } + ww;
        if !current_line.is_empty() && (projected > max_width || current_line.len() >= max_per_line)
        {
            line_groups.push(current_line);
            current_line = Vec::new();
            current_width = 0.0;
        }
        current_line.push(i);
        current_width += if current_line.len() > 1 { gap } else { 0.0 } + ww;
    }
    if !current_line.is_empty() {
        line_groups.push(current_line);
    }

    // Line balancing: if last line is too short, steal from previous
    if line_groups.len() > 1 {
        let min_last = 2usize.max(max_per_line / 2);
        loop {
            let last_len = line_groups.last().map_or(0, |l| l.len());
            let prev_len = line_groups.get(line_groups.len() - 2).map_or(0, |l| l.len());
            if last_len >= min_last || prev_len <= 2 {
                break;
            }
            let prev_idx = line_groups.len() - 2;
            if let Some(moved) = line_groups[prev_idx].pop() {
                let last_idx = line_groups.len() - 1;
                line_groups[last_idx].insert(0, moved);
            } else {
                break;
            }
        }
    }

    let line_count = line_groups.len();
    let start_y = get_position_y(project, scene, line_count, line_height);

    let mut all_words = Vec::with_capacity(word_count);

    for (line_idx, indices) in line_groups.iter().enumerate() {
        let y = start_y + (line_idx as f64) * line_height + offset_y;
        let widths: Vec<f64> = indices.iter().map(|&i| word_widths[i]).collect();
        let total_w: f64 = widths.iter().sum::<f64>() + gap * (indices.len() as f64 - 1.0).max(0.0);

        let line_start_x = match project.font.text_align {
            TextAlign::Left => offset_x + project.width as f64 * safe.left,
            TextAlign::Center => (project.width as f64 - total_w) / 2.0 + offset_x,
            TextAlign::Right => {
                project.width as f64 * (1.0 - safe.right) - total_w + offset_x
            }
            TextAlign::Justify => offset_x + project.width as f64 * safe.left,
        };

        let justify_gap =
            if matches!(project.font.text_align, TextAlign::Justify) && indices.len() > 1 {
                let available =
                    project.width as f64 * (1.0 - safe.left - safe.right) - widths.iter().sum::<f64>();
                available / (indices.len() as f64 - 1.0)
            } else {
                gap
            };

        let mut cursor_x = line_start_x;
        for (pos, &src_idx) in indices.iter().enumerate() {
            let is_active = src_idx >= active_index && src_idx < active_end;
            let word_color = scene
                .word_colors
                .get(&src_idx.to_string())
                .cloned();

            all_words.push(CaptionWord {
                value: words[src_idx].to_string(),
                source_index: src_idx,
                line: line_idx,
                x: cursor_x,
                y,
                width: widths[pos],
                active: is_active,
                color: word_color,
            });
            cursor_x += widths[pos] + justify_gap;
        }
    }

    CaptionLayout {
        scene_id: scene.id.clone(),
        words: all_words,
        font_size,
        line_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::renderer::model::*;
    use std::collections::HashMap;

    fn scene(text: &str, duration: f64, active_word_count: u32) -> NativeScene {
        NativeScene {
            id: "test".into(),
            text: text.into(),
            duration,
            animation_style: AnimationStyle::Punch,
            accent: "#FF3B30".into(),
            active_word_count,
            offset_x: 0.0,
            offset_y: 0.0,
            word_colors: HashMap::new(),
            image_layers: Vec::new(),
            camera: None,
            transition: None,
            graphic_layers: Vec::new(),
            video_layers: Vec::new(),
        }
    }

    fn project_with(scene: NativeScene) -> NativeRenderProject {
        NativeRenderProject {
            width: 1080,
            height: 1920,
            fps: 30,
            duration: scene.duration,
            scenes: vec![scene],
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
                highlight_shape: HighlightShape::None,
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
    fn test_word_grouping_count_1() {
        let s = scene("one two three four five", 3.0, 1);
        // At t=0.0, first word group
        let idx = get_active_word_index(&s, 5, 0.2);
        assert_eq!(idx, 0);
        // Later time steps through
        let idx2 = get_active_word_index(&s, 5, 1.0);
        assert!(idx2 > 0, "should advance past first word");
    }

    #[test]
    fn test_word_grouping_count_2() {
        let s = scene("one two three four", 4.0, 2);
        let idx = get_active_word_index(&s, 4, 0.2);
        // Group start should be even (0, 2)
        assert_eq!(idx % 2, 0, "active index should be at group boundary");
    }

    #[test]
    fn test_word_grouping_count_3() {
        let s = scene("a b c d e f g h i", 5.0, 3);
        let idx = get_active_word_index(&s, 9, 0.2);
        assert_eq!(idx % 3, 0, "active index should be at group boundary of 3");
    }

    #[test]
    fn test_word_grouping_count_4() {
        let s = scene("a b c d e f g h", 4.0, 4);
        let idx = get_active_word_index(&s, 8, 1.5);
        assert_eq!(idx % 4, 0, "active index should be at group boundary of 4");
    }

    #[test]
    fn test_per_word_color() {
        let mut s = scene("hello world test", 3.0, 1);
        s.word_colors.insert("1".to_string(), "#FF0000".to_string());

        let proj = project_with(s);
        let layout = compute_caption_layout(&proj, &proj.scenes[0], 0.5);
        let colored_word = layout.words.iter().find(|w| w.source_index == 1).unwrap();
        assert_eq!(colored_word.color.as_deref(), Some("#FF0000"));
        // Other words should have no custom color
        let first = layout.words.iter().find(|w| w.source_index == 0).unwrap();
        assert!(first.color.is_none());
    }

    #[test]
    fn test_alignment_center_symmetry() {
        let proj = project_with(scene("hello world", 2.0, 1));
        let layout = compute_caption_layout(&proj, &proj.scenes[0], 0.0);
        // With center alignment, words should be roughly centered
        let mid_x = proj.width as f64 / 2.0;
        let first = &layout.words[0];
        let last = &layout.words[layout.words.len() - 1];
        let block_center = (first.x + last.x + last.width) / 2.0;
        assert!(
            (block_center - mid_x).abs() < proj.width as f64 * 0.15,
            "text block should be roughly centered"
        );
    }

    #[test]
    fn test_line_count_respects_max_words_per_line() {
        let proj = project_with(scene("a b c d e f g h", 3.0, 1));
        let layout = compute_caption_layout(&proj, &proj.scenes[0], 0.0);
        // 8 words with max 4 per line → at least 2 lines
        assert!(layout.line_count >= 2);
    }

    #[test]
    fn test_active_words_are_marked() {
        let s = scene("one two three four", 3.0, 2);
        let proj = project_with(s);
        let layout = compute_caption_layout(&proj, &proj.scenes[0], 0.2);
        let active_count = layout.words.iter().filter(|w| w.active).count();
        assert_eq!(active_count, 2, "exactly 2 words should be active");
    }
}
