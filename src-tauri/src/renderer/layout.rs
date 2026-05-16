use serde::Serialize;

use super::model::{NativeFontControls, NativeScene, TextAlign};

/// A single word token produced by the layout pass.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutWord {
    pub value: String,
    pub source_index: usize,
    pub line: usize,
    pub x: f64,
    pub y: f64,
}

/// A line of words produced by the layout pass.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutLine {
    pub line_index: usize,
    pub words: Vec<LayoutWord>,
    pub y: f64,
}

/// The result of laying out a single scene's text.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutResult {
    pub scene_id: String,
    pub lines: Vec<LayoutLine>,
    pub total_lines: usize,
    pub canvas_width: u32,
    pub canvas_height: u32,
}

/// Compute a basic text layout for a scene.
///
/// This splits the scene text into words, optionally uppercases them,
/// groups them into lines based on `max_words_per_line`, and assigns
/// placeholder positions. Real glyph measurement will come later with Skia.
pub fn compute_layout(
    scene: &NativeScene,
    font: &NativeFontControls,
    canvas_width: u32,
    canvas_height: u32,
) -> LayoutResult {
    let raw_text = if font.uppercase {
        scene.text.to_uppercase()
    } else {
        scene.text.clone()
    };

    let words: Vec<&str> = raw_text.split_whitespace().collect();
    let max_per_line = (font.max_words_per_line as usize).max(1);

    // Group words into lines
    let word_lines: Vec<Vec<(usize, &str)>> = words
        .iter()
        .enumerate()
        .collect::<Vec<_>>()
        .chunks(max_per_line)
        .map(|chunk| chunk.iter().map(|&(i, w)| (i, *w)).collect())
        .collect();

    let total_lines = word_lines.len();

    // Match the current frontend base-size heuristic until real font metrics are introduced.
    let word_count = words.len();
    let density = if word_count > 18 {
        0.064
    } else if word_count > 8 {
        0.074
    } else {
        0.088
    };
    let shortest_side = canvas_width.min(canvas_height) as f64;
    let font_size = (shortest_side * density * font.size_scale).clamp(34.0, 154.0).round();
    let line_spacing = font_size * font.line_height;
    let offset_x = (scene.offset_x / 100.0) * canvas_width as f64;
    let offset_y = (scene.offset_y / 100.0) * canvas_height as f64;

    // Total text block height
    let block_height = total_lines as f64 * line_spacing;
    let start_y = ((canvas_height as f64) - block_height) / 2.0 + font_size * 0.5;

    let mut layout_lines = Vec::with_capacity(total_lines);

    for (line_idx, line_words) in word_lines.iter().enumerate() {
        let y = start_y + (line_idx as f64) * line_spacing + offset_y;

        // Estimate word widths (rough: char_count * font_size * 0.6)
        let char_factor = 0.6;
        let space_width = font_size * 0.3;
        let word_widths: Vec<f64> = line_words
            .iter()
            .map(|(_, w)| w.len() as f64 * font_size * char_factor + font.letter_spacing * (w.len() as f64))
            .collect();
        let total_width: f64 =
            word_widths.iter().sum::<f64>() + space_width * (line_words.len() as f64 - 1.0).max(0.0);

        // Compute starting x based on alignment
        let line_start_x = match font.text_align {
            TextAlign::Left => offset_x + canvas_width as f64 * 0.05,
            TextAlign::Center => (canvas_width as f64 - total_width) / 2.0 + offset_x,
            TextAlign::Right => canvas_width as f64 * 0.95 - total_width + offset_x,
            TextAlign::Justify => offset_x + canvas_width as f64 * 0.05,
        };

        let mut cursor_x = line_start_x;
        let justify_gap = if matches!(font.text_align, TextAlign::Justify) && line_words.len() > 1 {
            let available = canvas_width as f64 * 0.9 - word_widths.iter().sum::<f64>();
            available / (line_words.len() as f64 - 1.0)
        } else {
            space_width
        };

        let mut words_out = Vec::with_capacity(line_words.len());
        for (i, &(src_idx, word)) in line_words.iter().enumerate() {
            words_out.push(LayoutWord {
                value: word.to_string(),
                source_index: src_idx,
                line: line_idx,
                x: cursor_x,
                y,
            });
            cursor_x += word_widths[i] + justify_gap;
        }

        layout_lines.push(LayoutLine {
            line_index: line_idx,
            words: words_out,
            y,
        });
    }

    LayoutResult {
        scene_id: scene.id.clone(),
        lines: layout_lines,
        total_lines,
        canvas_width,
        canvas_height,
    }
}
