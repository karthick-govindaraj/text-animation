# Production Agent Prompts

Use these prompts one at a time. After each agent finishes, review the result before starting the next prompt. The goal is a production-grade Tauri application with a Rust-native renderer/export pipeline, not a browser-canvas export system.

Global rules for every agent:

- Work in `/home/aximsoft/project/Z/text-animation`.
- Keep the app scene-based.
- Prefer Rust/Tauri for render, assets, export, validation, and production logic.
- React is for UI/control only.
- Do not remove existing working functionality unless replacing it with a verified equivalent.
- Keep changes modular and readable.
- After implementation, run:
  ```bash
  npm run build
  cargo check
  npx tauri build --debug --no-bundle
  ```
- Return files changed, implementation summary, verification results, risks, and remaining TODOs.

---

## Prompt 1: Native Rust Renderer Foundation

You are implementing the foundation for a production Rust-native renderer.

Goal: create the native render model and basic layout architecture that will replace browser canvas for production preview/export.

Requirements:

- Create or refine `src-tauri/src/renderer/`.
- Keep modules simple:
  - `mod.rs`
  - `model.rs`
  - `layout.rs`
  - `engine.rs`
- Define serde-compatible Rust models for:
  - project width/height/fps/duration
  - scenes
  - scene id/title/text/duration
  - animation style
  - accent color
  - active word count
  - offset X/Y
  - font family/weight/size scale
  - uppercase
  - letter spacing
  - line height
  - stroke width
  - shadow blur
  - text color
  - text alignment
- Implement basic native layout:
  - split text into words
  - uppercase toggle
  - max words per line
  - line positions
  - alignment
  - frontend-compatible percentage offsets
  - frontend-compatible font-size heuristic
- Add Tauri command:
  - `debug_native_layout(project: NativeRenderProject) -> Result<LayoutResult, String>`
- Register the command in `src-tauri/src/lib.rs`.
- Do not add Skia yet.
- Do not implement export yet.
- Preserve current browser renderer and existing export code.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`

Deliverables:

- Files changed.
- Native model summary.
- Command signature.
- Verification results.
- Risks/assumptions.

---

## Prompt 2: Native Skia Frame Renderer MVP

You are implementing the first real Rust-native frame renderer.

Goal: render a PNG frame from Rust using Skia, driven by `NativeRenderProject`, without browser canvas.

Requirements:

- Add `skia-safe` to `src-tauri/Cargo.toml`.
- Add a focused rendering module if needed:
  - `paint.rs` or `frame.rs`
- Implement native frame rendering:
  - input: `NativeRenderProject`
  - input: `time: f64`
  - output: PNG bytes
- Render behavior:
  - solid/transparent-compatible background structure, but solid dark background is acceptable for MVP
  - choose active scene by cumulative duration
  - use native layout result
  - draw text words
  - respect uppercase
  - text alignment
  - font size scale
  - line height
  - approximate letter spacing
  - text color
  - accent color as stroke/border
  - stroke width
  - shadow blur approximation
  - offset X/Y
- Add Tauri command:
  - `render_native_frame_png(project: NativeRenderProject, time: f64) -> Result<Vec<u8>, String>`
- Add at least one Rust unit test:
  - active scene selection, or
  - PNG bytes are non-empty
- Do not implement B-roll, transitions, MP4 export, audio, or full font manager in this prompt.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`

Deliverables:

- Files changed.
- Command signature.
- Renderer behavior.
- Known limitations.
- Verification results.

---

## Prompt 3: Native Preview Integration And Shared Render State

You are connecting the React UI to the Rust-native renderer.

Goal: make the app able to preview frames from Rust while keeping the current browser preview available as fallback.

Requirements:

- Add TypeScript helpers for:
  - converting current app state into `NativeRenderProject`
  - invoking `debug_native_layout`
  - invoking `render_native_frame_png`
- Add a UI toggle:
  - Browser Preview
  - Native Preview
- Native Preview behavior:
  - request PNG frame for current playhead
  - display it in the preview area
  - preserve play/pause/seek behavior
  - throttle requests so UI remains usable
  - show clear native-render errors
- Keep browser canvas preview intact.
- Keep current JSON import/export intact.
- Add warnings if native renderer misses unsupported features.
- Do not implement MP4 export in this prompt.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`
- Manually verify native preview shows text for `sample-project.json`.

Deliverables:

- Files changed.
- UI behavior summary.
- Fallback behavior.
- Verification results.
- Remaining gaps.

---

## Prompt 4: Native Caption Engine And Typography Styling

You are upgrading the Rust renderer caption engine.

Goal: port premium caption behavior into Rust so native preview/export can match production visuals.

Requirements:

- Extend native models for:
  - caption blocks per scene
  - active word count
  - non-overlapping word groups
  - per-word styles
  - solid text color
  - gradient text color
  - stroke
  - glow/shadow
  - highlight shape
  - max words per line
  - safe-area positioning
  - text alignment
- Implement Rust caption engine:
  - active word group selection by local scene time
  - non-overlapping stepping
  - per-word color
  - gradient fill approximation
  - stroke and shadow
  - word layout with line balancing
  - safe-area bounds
- Keep typography style hidden/default behavior compatible with current app.
- Add unit tests for:
  - word grouping
  - active word count 1/2/3/4
  - per-word color mapping
  - alignment
- Do not implement image/video layers yet.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`

Deliverables:

- Files changed.
- Caption engine behavior.
- Tests added.
- Differences from browser renderer.
- Verification results.

---

## Prompt 5: Native Animation Presets And Scene Timing

You are implementing native animation/timing behavior.

Goal: port scene-local timeline and animation presets into the Rust renderer.

Requirements:

- Add scene-local timeline helpers:
  - global time to scene index/local time
  - scene progress
  - element progress
- Implement native animation presets:
  - TikTok Bounce
  - Shorts Pop
  - Karaoke
  - Glitch Reveal
  - Lower Third
  - Word Zoom
  - Caption Stack
  - Neon Flicker
  - Minimal Fade
  - Stomp
  - Elastic Pop
  - News Ticker
  - Clean Subtitle
  - Comic Pop
  - Luxury Title
  - Tech HUD
  - Punch
  - Cascade
  - Typewriter
  - Drift
- Implement native easing helpers:
  - linear
  - ease in/out
  - ease out cubic
  - spring/elastic approximation
- Add tests for:
  - scene timing
  - animation transform output at start/mid/end
  - typewriter reveal
  - news ticker motion
- Keep output deterministic.
- Do not add B-roll/video/export yet.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`

Deliverables:

- Files changed.
- Animation engine summary.
- Tests added.
- Unsupported/approximated effects.
- Verification results.

---

## Prompt 6: Workspace And Asset Manager

You are implementing the production asset/workspace layer.

Goal: make projects portable and make native rendering/export use local assets instead of live remote URLs.

Requirements:

- Define workspace structure:
  ```txt
  project-folder/
    project.json
    assets/
      images/
      videos/
      audio/
      graphics/
      fonts/
    cache/
      remote-images/
      thumbnails/
    exports/
    temp/
  ```
- Add Rust asset manager module:
  - create/open workspace
  - copy imported local files into assets
  - download/cache remote image URLs
  - validate local paths
  - resolve relative paths
  - report missing assets
- Support image URL fallback list:
  - try rank 1
  - if failed, try rank 2
  - if failed, try rank 3+
- Add Tauri commands:
  - create/open workspace
  - cache remote image
  - validate project assets
- Update TypeScript helpers and JSON normalization where needed.
- Do not implement video layer rendering yet.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`
- Test broken image fallback.

Deliverables:

- Files changed.
- Workspace model.
- Asset commands.
- Validation behavior.
- Verification results.

---

## Prompt 7: Native Image B-Roll, Camera Motion, And Transitions

You are implementing native image B-roll rendering.

Goal: Rust renderer supports image-based premium scene visuals.

Requirements:

- Extend native schema/model for image layers:
  - up to 10 images per scene
  - start/end
  - zIndex
  - fit: cover/contain/stretch
  - opacity
  - blur
  - darken
  - vignette
  - crop
  - keyframe transform
  - entrance effect
  - exit effect
  - fallback asset candidates
- Keep legacy scene `broll` field compatible by mapping it into image layer 0.
- Load images from local cache/workspace paths.
- Render images behind captions.
- Implement Ken Burns/camera motion:
  - zoom from/to
  - pan X/Y from/to
  - easing
- Implement scene transitions:
  - cut
  - fade
  - zoom
  - slide
  - blur
  - flash
  - glitch approximation
- Add tests for:
  - image fit math
  - fallback selection
  - camera interpolation
  - transition progress

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`
- Manually preview sample with B-roll through native renderer.

Deliverables:

- Files changed.
- Image layer behavior.
- Transition behavior.
- Compatibility notes.
- Verification results.

---

## Prompt 8: Native Graphics, Local Video Layers, Keyframes, And Chroma Key

You are implementing advanced scene elements in the native renderer.

Goal: support production visual flexibility without becoming a full manual NLE.

Requirements:

- Add native models and rendering for external graphics assets:
  - arrow
  - circle
  - underline
  - warning label
  - stat card
  - quote card
  - HUD overlay
- Prefer external asset files over code-generated graphics for production.
- Keep old graphics JSON as fallback compatibility.
- Add local video layer model:
  - local path
  - start/end
  - trim in/out
  - speed
  - mute
  - opacity
  - fit/crop
  - transform
  - entrance/exit
- Add keyframe model for visual elements:
  - x/y
  - scale
  - rotation
  - opacity
  - blur
  - crop
  - easing
- Add chroma key model:
  - enabled
  - key color
  - similarity
  - smoothness
  - spill reduction
  - edge softness
  - green/blue presets
- Implement image/graphics keyframes in Rust renderer.
- For video layers, implement the model and validation first; if full frame decoding is too large, add a clear stub and command boundary for the next export implementation.
- Add tests for keyframe interpolation and chroma key parameter validation.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`

Deliverables:

- Files changed.
- Model additions.
- Implemented renderer support.
- Stubs/limitations.
- Verification results.

---

## Prompt 9: Production Native Export Job System

You are implementing the production export pipeline.

Goal: export videos from the Rust-native renderer through backend jobs and native FFmpeg.

Requirements:

- Add export job manager in Rust:
  - queued
  - preparing_assets
  - rendering_frames
  - encoding
  - completed
  - failed
  - cancelled
- Add job folder structure:
  ```txt
  app-cache/exports/job-id/
    manifest.json
    frames/
    output.mp4
    logs/
  ```
- Render frames using Rust-native renderer, not browser canvas.
- Encode via native FFmpeg.
- Emit Tauri progress events:
  - job started
  - asset preparation progress
  - frame rendered x/y
  - encoding progress
  - completed path
  - failed error
- Add cancel command.
- Add cleanup policy.
- Add export presets:
  - YouTube Shorts 1080x1920 MP4
  - Instagram Reels 1080x1920 MP4
  - Square 1080x1080 MP4
  - Landscape 1920x1080 MP4
  - Alpha WebM placeholder if not ready
  - Alpha MOV/ProRes placeholder if not ready
- Add bitrate/FPS controls in model.
- Keep current Fast Draft MP4 as fallback if needed, but production export must use native renderer.
- Add tests for:
  - job state transitions
  - frame path generation
  - FFmpeg command construction

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`
- Export 10s sample project.
- Export 60s project if feasible.

Deliverables:

- Files changed.
- Export command signatures.
- Event names/payloads.
- Verification results.
- Known limitations.

---

## Prompt 10: Production Schema V3, QC, UI Integration, Tests, And Docs

You are hardening the full application for production use.

Goal: finalize the production JSON workflow, UI integration, quality reports, tests, and documentation.

Requirements:

- Add schema version:
  - `version: 3`
  - `schema: "scene-production-v3"`
- Keep import compatibility:
  - v1
  - v2
  - v3
- Add schema validation for:
  - project title/platform/aspectRatio/fps/duration
  - styleProfile
  - retentionStrategy
  - scenes
  - scene timeline
  - caption blocks
  - image layers
  - video layers
  - graphics layers
  - camera
  - transitions
  - quality controls
- Update `sample-project.json`.
- Add JSON quality report:
  - missing scenes
  - missing text
  - missing duration
  - missing B-roll/images
  - broken URLs
  - missing local assets
  - weak visual density
  - scenes with no motion
  - repeated animation overuse
  - too many words per caption
  - safe-area risks
- UI integration:
  - native preview as primary preview
  - browser preview as legacy/debug fallback
  - export job progress panel
  - export logs/errors
  - open export folder
  - load sample project
  - collapsible advanced panels
  - usable 20+ scene list
- Tests:
  - scene defaults
  - schema migration
  - timeline math
  - word grouping
  - keyframe interpolation
  - asset validation
  - app mount smoke test
  - JSON import/export smoke test
  - native export command smoke test
- Documentation:
  - app workflow
  - JSON schema
  - ChatGPT premium JSON prompt
  - asset rules
  - export rules
- Update `TODO.md` checkboxes accurately.

Verification:

- `npm run build`
- `cargo check`
- `npx tauri build --debug --no-bundle`
- `npm audit`
- Import v1/v2/v3 fixtures.
- Export sample MP4.

Deliverables:

- Files changed.
- Production schema summary.
- QC report summary.
- UI changes.
- Test/doc additions.
- Verification results.
- Final production readiness assessment.
