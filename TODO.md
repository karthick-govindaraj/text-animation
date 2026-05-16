# Master TODO

Scene-based roadmap for building the JSON-driven kinetic text video automation app.

## Current Audit - 2026-05-16

Status after the multi-agent native renderer pass:

- [x] Rust renderer module structure exists.
- [x] Skia dependency is installed.
- [x] Native PNG frame command exists: `render_native_frame_png`.
- [x] Native preview UI toggle exists.
- [x] Rust modules exist for animation, caption, B-roll, keyframes, workspace, schema, and export jobs.
- [x] Rust unit tests pass.
- [x] `npm run build` passes.
- [ ] Native preview is not production-accurate yet.
- [x] TypeScript -> Rust project conversion now maps scene B-roll, camera, transition-in, and legacy graphics fields.
- [x] Current native preview receives scene B-roll/image layer data.
- [x] Current native preview receives legacy `broll` fields mapped into image layers.
- [x] Native B-roll can load local paths and remote HTTP image URLs with fallback candidates.
- [x] Download MP4 now uses the Rust Skia native export job instead of `run_backend_scene_export`.
- [x] `start_native_export` now renders Skia PNG frames and runs FFmpeg.
- [ ] Export job progress events are not implemented.
- [ ] Export cancel is not implemented.
- [ ] Native export does not yet produce the same output as native preview.
- [ ] Production schema v3 exists in Rust, but UI import/export still mainly uses `scene-premium-v2`.
- [ ] `TODO.md` phase checkboxes below are not all updated to match the new native modules; use this audit as the source of truth until reconciled.

Immediate recovery priority:

1. Wire TypeScript conversion so native projects include image layers, camera, transitions, graphics, and v3 fields.
2. Replace `Download MP4` with the real native Skia export job, not `run_backend_scene_export`. Completed.
3. Implement `start_native_export` as an actual job: prepare assets, render Skia frames, run FFmpeg, emit progress, return output path. Frame rendering and FFmpeg are completed; progress events are still pending.
4. Keep browser preview/export as legacy fallback only.
5. Validate `sample-project.json` through native preview and native export.

Product goal:

```txt
ChatGPT premium JSON -> scene-based editor -> real-time preview -> reliable desktop export
```

Execution rule for every item:

```txt
Implement -> Test -> Verify -> Update TODO
```

Do not start a later phase until the current phase can produce a working video from JSON.

## Current Baseline

- [x] React/Vite app exists.
- [x] Tauri desktop shell exists.
- [x] Scene-based caption model exists.
- [x] Canvas preview renderer exists.
- [x] Browser MP4/WebM/MOV export exists.
- [x] Project JSON import/export exists.
- [x] Scene B-roll fields exist.
- [x] Scene camera fields exist.
- [x] Scene transition fields exist.
- [x] Scene graphics fields exist.
- [x] Local SFX folder exists at `sound-effects/`.
- [x] Native FFmpeg export is not complete.
- [ ] Scene timeline model is not complete.
- [x] Multi-image layer system is not complete.
- [x] Production JSON schema is not finalized.

---

# Phase 1: MVP Working App

Goal: make the current app a stable, usable desktop MVP that can import a JSON project, preview it, and export a working video.

Priority: **highest**. This phase must produce a usable app before we add complex editor features.

## 1.1 Tauri Desktop Stability

### Implement

- [x] Add Tauri v2 shell.
- [x] Keep React/Vite as the Tauri frontend.
- [x] Add Tauri scripts:
  - [x] `tauri:dev`
  - [x] `tauri:build`
- [x] Add Tauri plugins:
  - [x] dialog
  - [x] filesystem
  - [x] shell
  - [x] opener
- [x] Keep browser workflow available during migration.
- [ ] Verify desktop file dialogs manually.
- [ ] Verify project JSON open/save manually.
- [ ] Add a simple desktop status indicator:
  - [ ] Browser mode
  - [ ] Tauri desktop mode
  - [ ] FFmpeg available/unavailable

### Test

- [x] Run `npm run build`.
- [x] Run `cargo check` inside `src-tauri`.
- [x] Run `npx tauri build --debug --no-bundle`.
- [x] Run `npm audit`.
- [ ] Run `npm run tauri:dev`.
- [ ] Open the desktop app window.
- [ ] Import `sample-project.json`.
- [ ] Export project JSON from desktop.

### Verify

- [ ] App opens in Tauri.
- [ ] Existing preview canvas renders.
- [ ] JSON import works in desktop mode.
- [ ] JSON export works in desktop mode.
- [ ] Browser mode still works.

## 1.2 Native FFmpeg Export Foundation

### Implement

- [x] Add Rust command to check FFmpeg availability.
- [x] Add Rust command structure for FFmpeg export jobs.
- [x] Bundle FFmpeg as a Tauri sidecar or define system-FFmpeg fallback clearly.
- [x] Add frontend helper:
  - [x] `checkNativeFfmpegAvailable`
  - [x] `runNativeFfmpegExport`
- [x] Add output file picker using Tauri dialog.
- [x] Add frame export temp directory strategy.
- [x] Export canvas frames to temp directory.
- [x] Encode PNG frame sequence to MP4 using native FFmpeg.
- [ ] Add export progress events.
- [x] Add temp cleanup after success/failure/cancel.
- [x] Keep current browser export as fallback.

### Test

- [x] Run `npm run build`.
- [x] Run `cargo check`.
- [x] Run `npx tauri build --debug --no-bundle`.
- [ ] Export 10 second MP4 using native FFmpeg.
- [ ] Export 60+ second MP4 using native FFmpeg.
- [ ] Cancel an export and export again.

### Verify

- [ ] Native export succeeds for short videos.
- [ ] Native export succeeds for 60+ second videos.
- [ ] Output duration is correct.
- [ ] Output FPS is correct.
- [ ] Output resolution is correct.
- [ ] Temp files are cleaned.
- [x] Browser export still works.

## 1.3 MVP JSON Workflow

### Implement

- [x] Create a strict `scene-premium-v2` validator.
- [x] Show clear import errors with field names.
- [x] Preserve current project if import fails.
- [x] Normalize old/missing scene fields safely.
- [x] Keep `sample-project.json` valid and up to date.
- [ ] Add one-click "Load Sample Project".
- [ ] Add a small JSON quality report:
  - [ ] missing scenes
  - [ ] missing text
  - [ ] missing duration
  - [ ] missing B-roll URLs
  - [ ] invalid animation preset
  - [ ] invalid image URL

### Test

- [ ] Import valid `sample-project.json`.
- [ ] Import malformed JSON.
- [ ] Import unsupported schema.
- [ ] Import JSON with missing optional fields.
- [ ] Export and re-import the same project.

### Verify

- [ ] Invalid imports do not destroy work.
- [ ] Exported JSON imports again.
- [ ] App can go from JSON to preview to video export.

## 1.4 MVP UI Cleanup

### Implement

- [ ] Keep left panel focused on scenes only.
- [ ] Keep center focused on preview.
- [ ] Keep right panel focused on selected scene controls.
- [ ] Reduce clutter in MVP mode.
- [ ] Add collapsible advanced sections.
- [ ] Add clear export area.
- [ ] Add error/warning panel.
- [ ] Keep 20+ scenes manageable with scroll.

### Test

- [ ] Test 1366x768 viewport.
- [ ] Test 1440x900 viewport.
- [ ] Test 1920x1080 viewport.
- [ ] Test project with 20+ scenes.

### Verify

- [ ] No major controls are hidden.
- [ ] No horizontal overflow.
- [ ] Scene list remains usable.
- [ ] Preview remains visible.

## Phase 1 Done Criteria

- [ ] User can import ChatGPT JSON.
- [ ] User can preview the animation.
- [ ] User can export a successful MP4.
- [ ] 60+ second export works through native FFmpeg.
- [ ] Project JSON can be saved and reopened.
- [ ] App is stable enough for daily MVP use.

---

# Phase 2: Advanced Feature 1

Goal: upgrade the visual output quality while keeping the same scene-based JSON workflow.

Priority: premium short-form visuals.

## 2.1 Scene Timeline Model

### Implement

- [ ] Add scene-local timeline.
- [ ] Each scene owns:
  - [ ] duration
  - [ ] local time
  - [ ] captions
  - [ ] image layers
  - [ ] graphics
  - [ ] transitions
  - [ ] camera
  - [ ] effects
- [ ] Keep global timeline derived from scene order.
- [ ] Add scene progress calculation.
- [ ] Make all scene effects use local time.

### Test

- [ ] Run `npm run build`.
- [ ] Import project with 5 scenes.
- [ ] Import project with 20 scenes.
- [ ] Change scene duration.
- [ ] Verify total duration updates.

### Verify

- [ ] Scene timing does not drift.
- [ ] Scene-local animations start/end correctly.
- [ ] Export matches preview.

## 2.2 Premium Caption Engine

### Implement

- [ ] Support multiple caption blocks per scene.
- [ ] Support active word groups.
- [ ] Support non-overlapping word group stepping.
- [ ] Support per-word styling:
  - [ ] color
  - [ ] gradient
  - [ ] stroke
  - [ ] glow
  - [ ] scale
  - [ ] emphasis animation
- [ ] Support line balancing.
- [ ] Support max words per line.
- [ ] Support safe-area positioning.
- [ ] Support scene-level x/y offset.
- [ ] Support text alignment:
  - [ ] left
  - [ ] center
  - [ ] right
  - [ ] justify

### Test

- [ ] Active word count 1.
- [ ] Active word count 2.
- [ ] Active word count 3.
- [ ] Active word count 4.
- [ ] Multi-line caption.
- [ ] Per-word color.
- [ ] Gradient caption.
- [ ] Export and compare with preview.

### Verify

- [ ] Word groups do not overlap unless configured.
- [ ] Captions stay inside safe zones.
- [ ] Text does not clip.
- [ ] Preview and export match.

## 2.3 Image B-Roll System

### Implement

- [ ] Support up to 10 image assets per scene.
- [ ] Each image supports:
  - [ ] start
  - [ ] end
  - [ ] zIndex
  - [ ] fit: cover/contain/stretch
  - [ ] opacity
  - [ ] blur
  - [ ] darken
  - [ ] vignette
  - [ ] crop
  - [ ] keyframe transform
  - [ ] entrance effect
  - [ ] exit effect
- [ ] Support external image URLs.
- [ ] Support 3+ fallback URLs per image layer.
- [ ] Cache remote images.
- [ ] Warn on CORS/export failure.
- [ ] Keep legacy `broll` field compatible.

### Test

- [ ] Scene with 1 image.
- [ ] Scene with 3 images.
- [ ] Scene with 10 images.
- [ ] Broken first image URL falls back to second URL.
- [ ] Export with image B-roll.

### Verify

- [ ] Images render behind captions.
- [ ] Image transforms work.
- [ ] Fallbacks work.
- [ ] Failed images do not crash export.

## 2.4 Camera And Transitions

### Implement

- [ ] Add Ken Burns per image:
  - [ ] zoom from/to
  - [ ] pan x/y from/to
  - [ ] easing
- [ ] Add scene transitions:
  - [ ] cut
  - [ ] fade
  - [ ] zoom
  - [ ] slide
  - [ ] blur
  - [ ] flash
  - [ ] glitch
- [ ] Add element entrance/exit transitions.
- [ ] Add transition duration validation.

### Test

- [ ] Test each transition type.
- [ ] Test Ken Burns movement.
- [ ] Test transition in.
- [ ] Test transition out.
- [ ] Export transition-heavy project.

### Verify

- [ ] Transitions do not break caption timing.
- [ ] Preview and export match.
- [ ] Motion feels smooth.

## Phase 2 Done Criteria

- [ ] Captions look premium.
- [ ] Scenes support multiple image B-roll layers.
- [ ] Camera motion works.
- [ ] Transitions work.
- [ ] ChatGPT JSON can drive premium visual pacing.

---

# Phase 3: Advanced Feature 2

Goal: add deeper editing power, local assets, real transforms, and green-screen support.

Priority: production flexibility without becoming a full manual NLE.

## 3.1 Project Workspace And Local Assets

### Implement

- [ ] Define project workspace folder structure:
  - [ ] project JSON
  - [ ] assets
  - [ ] cache
  - [ ] exports
  - [ ] temp
- [ ] Support local asset paths for:
  - [ ] SFX
  - [ ] music
  - [ ] voiceover
  - [ ] video
  - [ ] overlay graphics
- [ ] Support relative paths inside project files.
- [ ] Validate local paths before preview/export.
- [ ] Add missing asset warnings.
- [ ] Add asset relink flow.

### Test

- [ ] Create project folder.
- [ ] Save project into folder.
- [ ] Add local SFX.
- [ ] Add local video.
- [ ] Move project folder and reopen.
- [ ] Relink missing asset.

### Verify

- [ ] Project files are portable.
- [ ] Missing assets are clearly shown.
- [ ] Local paths work in Tauri.

## 3.2 Local Video Layers

### Implement

- [ ] Support local video layers per scene.
- [ ] Each video layer supports:
  - [ ] local path
  - [ ] start
  - [ ] end
  - [ ] trim in
  - [ ] trim out
  - [ ] playback speed
  - [ ] mute
  - [ ] opacity
  - [ ] fit
  - [ ] crop
  - [ ] keyframe transforms
  - [ ] entrance effect
  - [ ] exit effect
- [ ] Support video frame sampling in preview.
- [ ] Support video layers in native FFmpeg export.

### Test

- [ ] Add short local MP4.
- [ ] Add long local MP4.
- [ ] Trim video.
- [ ] Change speed.
- [ ] Export video layer project.

### Verify

- [ ] Video frames sync correctly.
- [ ] Preview does not freeze.
- [ ] Export includes video layers.

## 3.3 Transform Keyframes

### Implement

- [ ] Add keyframes to all visual elements:
  - [ ] captions
  - [ ] image layers
  - [ ] video layers
  - [ ] graphic layers
- [ ] Keyframe properties:
  - [ ] x
  - [ ] y
  - [ ] scale
  - [ ] rotation
  - [ ] opacity
  - [ ] blur
  - [ ] crop
- [ ] Add easing per keyframe segment.
- [ ] Add copy/paste keyframes.
- [ ] Add reset keyframes.

### Test

- [ ] Keyframe caption.
- [ ] Keyframe image.
- [ ] Keyframe video.
- [ ] Copy/paste keyframes.
- [ ] Export keyframed scene.

### Verify

- [ ] Keyframes interpolate correctly.
- [ ] Export matches preview.
- [ ] Keyframes remain inside scene duration.

## 3.4 Chroma Key

### Implement

- [ ] Add chroma key settings per image/video layer:
  - [ ] enabled
  - [ ] key color
  - [ ] similarity
  - [ ] smoothness
  - [ ] spill reduction
  - [ ] edge softness
- [ ] Add green-screen preset.
- [ ] Add blue-screen preset.
- [ ] Apply in preview.
- [ ] Apply in export.

### Test

- [ ] Test green-screen image.
- [ ] Test green-screen video.
- [ ] Test blue-screen asset.
- [ ] Export chroma-keyed project.

### Verify

- [ ] Key color is removed cleanly.
- [ ] Subject edges remain acceptable.
- [ ] Preview and export match.

## 3.5 External Graphics Assets

### Implement

- [ ] Replace production code-drawn graphics with external asset layers.
- [ ] Support local graphic files:
  - [ ] arrow
  - [ ] circle
  - [ ] underline
  - [ ] warning label
  - [ ] stat card
  - [ ] quote card
  - [ ] HUD overlay
- [ ] Allow transform/timing/effects per graphic asset.
- [ ] Keep old graphics JSON as compatibility fallback.

### Test

- [ ] Add external arrow.
- [ ] Add external underline.
- [ ] Add external warning label.
- [ ] Export project with graphics.

### Verify

- [ ] Graphics render consistently.
- [ ] Missing graphic files warn clearly.
- [ ] Production visuals no longer rely on code-generated shapes.

## Phase 3 Done Criteria

- [ ] Project can use local assets safely.
- [ ] Scene can include images, video, captions, and graphics.
- [ ] Keyframes work across elements.
- [ ] Chroma key works.
- [ ] Export handles complex scenes.

---

# Phase 4: Production Implementation

Goal: harden the app into a production-ready automation engine.

Priority: stability, schema, quality control, testing, and release readiness.

## 4.1 Production JSON Schema

### Implement

- [ ] Add `version: 3`.
- [ ] Add `schema: "scene-production-v3"`.
- [ ] Keep compatibility:
  - [ ] version 1
  - [ ] version 2
  - [ ] version 3
- [ ] Add top-level project fields:
  - [ ] title
  - [ ] platform
  - [ ] aspectRatio
  - [ ] fps
  - [ ] duration
  - [ ] styleProfile
  - [ ] retentionStrategy
- [ ] Add scene fields:
  - [ ] intent
  - [ ] retentionRole
  - [ ] visualDensity
  - [ ] motionIntensity
  - [ ] scene timeline
  - [ ] caption blocks
  - [ ] image layers
  - [ ] video layers
  - [ ] graphics layers
  - [ ] camera
  - [ ] transitions
  - [ ] quality controls
- [ ] Update `sample-project.json`.
- [ ] Add schema validation file.

### Test

- [ ] Validate sample JSON.
- [ ] Import v1 JSON.
- [ ] Import v2 JSON.
- [ ] Import v3 JSON.
- [ ] Export v3 JSON and re-import.

### Verify

- [ ] No old project breaks.
- [ ] Required fields are documented.
- [ ] Optional fields have defaults.
- [ ] ChatGPT can generate usable v3 JSON.

## 4.2 Renderer Hardening

### Implement

- [ ] Use one shared render pipeline for preview/export.
- [ ] Separate UI state from render state.
- [ ] Add deterministic asset load order.
- [ ] Add render warnings.
- [ ] Add export-safe fallbacks.
- [ ] Add memory cleanup.
- [ ] Add long-video safeguards.
- [ ] Add export progress reporting.

### Test

- [ ] Export 15 second project.
- [ ] Export 60 second project.
- [ ] Export 90+ second project.
- [ ] Export with 20+ scenes.
- [ ] Export with 10 images in one scene.
- [ ] Export with local video.

### Verify

- [ ] Export does not fail silently.
- [ ] Preview and export match.
- [ ] Long exports complete reliably.
- [ ] Errors are actionable.

## 4.3 Quality Control System

### Implement

- [ ] Add project quality report.
- [ ] Check caption length.
- [ ] Check safe-area violations.
- [ ] Check missing B-roll.
- [ ] Check broken image URLs.
- [ ] Check missing local assets.
- [ ] Check weak visual density.
- [ ] Check scenes with no motion.
- [ ] Check repeated animation overuse.
- [ ] Check too many words per caption.

### Test

- [ ] Run report on strong project.
- [ ] Run report on weak project.
- [ ] Run report on broken asset project.
- [ ] Run report on long project.

### Verify

- [ ] Report is actionable.
- [ ] Report does not block export unless configured.
- [ ] Report helps improve premium JSON quality.

## 4.4 Testing Foundation

### Implement

- [ ] Add unit tests for:
  - [ ] scene defaults
  - [ ] schema migration
  - [ ] timeline math
  - [ ] word group segmentation
  - [ ] keyframe interpolation
  - [ ] asset validation
- [ ] Add smoke tests for:
  - [ ] app mount
  - [ ] JSON import
  - [ ] JSON export
  - [ ] sample project preview
  - [ ] native export command
- [ ] Add fixture projects:
  - [ ] minimal
  - [ ] v1
  - [ ] v2
  - [ ] v3
  - [ ] multi-image
  - [ ] local-video
  - [ ] broken-assets

### Test

- [ ] Run unit tests.
- [ ] Run smoke tests.
- [ ] Run `npm run build`.
- [ ] Run `cargo check`.
- [ ] Run `npm audit`.

### Verify

- [ ] Tests catch schema breakage.
- [ ] Tests catch timeline drift.
- [ ] Tests catch import/export loss.
- [ ] Tests are fast enough to run regularly.

## 4.5 Production Export Presets

### Implement

- [ ] Add export presets:
  - [ ] YouTube Shorts 1080x1920 MP4
  - [ ] Instagram Reels 1080x1920 MP4
  - [ ] Square 1080x1080 MP4
  - [ ] Landscape 1920x1080 MP4
  - [ ] Alpha WebM
  - [ ] Alpha MOV/ProRes
- [ ] Add bitrate controls.
- [ ] Add FPS controls.
- [ ] Add transparent background warnings.
- [ ] Add unsupported-export warnings.
- [ ] Add output folder picker.
- [ ] Add open export folder button.

### Test

- [ ] Export Shorts MP4.
- [ ] Export Reels MP4.
- [ ] Export square MP4.
- [ ] Export landscape MP4.
- [ ] Export alpha WebM.
- [ ] Export alpha MOV.

### Verify

- [ ] Files open in video editor.
- [ ] Resolution is correct.
- [ ] FPS is correct.
- [ ] Duration is correct.
- [ ] Alpha works where expected.

## 4.6 Documentation And Release

### Implement

- [ ] Document app workflow.
- [ ] Document JSON schema.
- [ ] Document ChatGPT prompt format.
- [ ] Document asset rules:
  - [ ] local files
  - [ ] remote images
  - [ ] CORS warnings
  - [ ] fallback URLs
- [ ] Document export rules.
- [ ] Document troubleshooting:
  - [ ] failed export
  - [ ] missing asset
  - [ ] broken image URL
  - [ ] transparent video
  - [ ] FFmpeg unavailable
- [ ] Prepare release checklist.

### Test

- [ ] Follow docs to create a project.
- [ ] Follow docs to import ChatGPT JSON.
- [ ] Follow docs to export MP4.
- [ ] Follow docs to fix missing asset.

### Verify

- [ ] A new user can follow docs.
- [ ] Docs match current app.
- [ ] Sample JSON works.

## Phase 4 Done Criteria

- [ ] App is stable for production usage.
- [ ] Native export is reliable.
- [ ] JSON schema is stable.
- [ ] Tests cover core behavior.
- [ ] Documentation is usable.
- [ ] The app can produce premium faceless video assets from ChatGPT JSON.

---

# Priority Summary

## Must Do First

- [ ] Finish Tauri desktop verification.
- [ ] Finish native FFmpeg MP4 export.
- [ ] Make JSON import/export bulletproof.
- [ ] Make one full sample project export successfully.

## Do Not Start Yet

- [ ] Local video layers.
- [ ] Chroma key.
- [ ] Full keyframe editor.
- [ ] External graphics asset replacement.
- [ ] Production schema v3.

## Agent Work Rule

When assigning work to another agent, give only one item group at a time.

Recommended order:

1. `Phase 1.2 Native FFmpeg Export Foundation`
2. `Phase 1.3 MVP JSON Workflow`
3. `Phase 1.4 MVP UI Cleanup`
4. `Phase 2.1 Scene Timeline Model`
5. `Phase 2.2 Premium Caption Engine`
