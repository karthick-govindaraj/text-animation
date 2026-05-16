use super::layout::{compute_layout, LayoutResult};
use super::model::NativeRenderProject;

/// Compute layout for the first scene (or a specified scene index) in the project.
pub fn debug_layout(project: &NativeRenderProject) -> Option<LayoutResult> {
    let scene = project.scenes.first()?;
    Some(compute_layout(
        scene,
        &project.font,
        project.width,
        project.height,
    ))
}
