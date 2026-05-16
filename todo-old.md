# Production Roadmap TODO

Scene-based production roadmap for the text animation video renderer.

Production direction: migrate the current React/Vite browser prototype into a **Tauri desktop application** first, then build advanced scene, asset, video, chroma key, and export features on top of that foundation.

Core rule for every phase: **implement, test, verify, then continue**. Do not start a later phase until the current phase builds cleanly and the app still opens, previews, imports, and exports.

## Current Baseline

- [x] React/Vite app exists.
- [x] Scene-based caption model exists.
- [x] Canvas renderer exists in `src/renderer.ts`.
- [x] Export flow exists in `src/videoExport.ts`.
- [x] Project JSON import/export exists.
- [x] Sample project exists in `sample-project.json`.
- [x] Local SFX folder exists at `sound-effects/`.
- [x] Premium scene fields exist for B-roll, camera, transitions, and graphics.
- [x] Tauri desktop shell is added.
- [ ] Native FFmpeg sidecar export is not added yet.
- [ ] Local file path support is started but not production-grade yet.

## Phase 1: Tauri Production Foundation

Goal: migrate the current React/Vite app into Tauri so the production app can support local SFX, local video files, real file paths, native FFmpeg export, longer videos, and desktop-grade project save/load.

### Implement

- [x] Add Tauri v2 to the current project.
- [x] Keep the existing React/Vite frontend as the Tauri web UI.
- [x] Add `src-tauri/` Rust application shell.
- [x] Configure Tauri dev/build commands.
- [x] Add Tauri app permissions intentionally, only for required features.
- [x] Add Tauri plugins:
  - [x] dialog plugin for open/save file dialogs
  - [x] filesystem plugin for local project/assets access
  - [x] shell plugin for native FFmpeg sidecar execution
  - [x] opener plugin if needed for opening export folders
- [ ] Add a desktop-safe project directory strategy:
  - [ ] app data folder
  - [ ] project file path
  - [ ] asset relative paths
  - [ ] export output folder
- [x] Keep browser preview working inside Tauri.
- [x] Keep existing `npm run dev` browser workflow temporarily during migration.
- [x] Add a `tauri:dev` script.
- [x] Add a `tauri:build` script.
- [x] Do not remove existing browser export until native FFmpeg export is working.

### Test

- [x] Run `npm run build`.
- [x] Run Tauri dev mode.
- [x] Confirm the app opens in a desktop window.
- [x] Confirm the existing preview canvas renders.
- [ ] Import `sample-project.json` from disk using a desktop file dialog.
- [ ] Export project JSON to disk using a desktop save dialog.
- [ ] Reload the app and reopen the saved project.
- [x] Run `cargo check`.
- [x] Run `npx tauri build --debug --no-bundle`.
- [x] Run `npm audit`.

### Verify

- [ ] Current UI behavior is preserved inside Tauri.
- [x] Scene preview matches the browser version.
- [ ] Project JSON import/export works through Tauri dialogs.
- [x] No current feature is removed during migration.
- [ ] The app can access user-selected local files without browser upload limitations.

## Phase 2: Native FFmpeg Export Foundation

Goal: replace fragile browser-only long export behavior with native FFmpeg through a Tauri sidecar while keeping current browser export as fallback during transition.

### Implement

- [ ] Bundle FFmpeg as a Tauri sidecar.
- [x] Add a Rust command to check FFmpeg availability.
- [x] Add a Rust command to run FFmpeg export jobs.
- [ ] Add a temporary frame-export pipeline from frontend canvas to a Tauri-managed temp directory.
- [ ] Encode image sequence to MP4 with native FFmpeg.
- [ ] Add output path selection through Tauri save dialog.
- [ ] Add export progress reporting from Rust to frontend.
- [ ] Add export cancellation.
- [ ] Add cleanup for temporary frame/audio files.
- [x] Keep current browser MP4/WebM/MOV export available until parity is reached.
- [ ] Add production export presets:
  - [ ] 1080x1920 MP4
  - [ ] 1080x1080 MP4
  - [ ] 1920x1080 MP4
  - [ ] transparent WebM if supported
  - [ ] transparent MOV/ProRes through FFmpeg

### Test

- [x] Run `npm run build`.
- [ ] Run Tauri dev mode.
- [ ] Export a 10 second MP4 using native FFmpeg.
- [ ] Export a 60+ second MP4 using native FFmpeg.
- [ ] Export with transparent background where supported.
- [ ] Cancel an export midway.
- [ ] Export again after cancellation.

### Verify

- [ ] Native export completes more reliably than FFmpeg.wasm for long videos.
- [ ] Output duration matches project duration.
- [ ] Output resolution matches selected preset.
- [ ] Output FPS matches project FPS.
- [ ] Temporary files are cleaned after success/failure/cancel.
- [ ] Browser fallback export still works if native export is unavailable.

## Phase 3: Simple Modular Architecture

Goal: move from large feature-heavy files into a simple, maintainable structure without over-engineering.

### Implement

- [ ] Create a simple folder structure:
  - [ ] `src/types/`
  - [ ] `src/constants/`
  - [ ] `src/utils/`
  - [ ] `src/project/`
  - [ ] `src/renderer/`
  - [ ] `src/export/`
  - [ ] `src/components/`
  - [ ] `src/assets/`
- [ ] Move shared TypeScript types out of `renderer.ts`.
- [ ] Move project JSON import/export helpers into `src/project/projectFiles.ts`.
- [ ] Move project defaults into `src/project/defaults.ts`.
- [ ] Move renderer math helpers into `src/renderer/math.ts`.
- [ ] Move canvas drawing helpers into `src/renderer/draw.ts`.
- [ ] Keep public app behavior unchanged.
- [ ] Avoid deep folder nesting unless a file becomes hard to maintain.

### Test

- [ ] Run `npm run build`.
- [ ] Run `npm audit`.
- [ ] Open the app locally.
- [ ] Import `sample-project.json`.
- [ ] Export JSON.
- [ ] Export a short MP4.

### Verify

- [ ] Existing scenes render the same after refactor.
- [ ] Existing exports still work.
- [ ] No project JSON fields are lost on import/export.
- [ ] No circular imports are introduced.

## Phase 4: Scene Data Model Hardening

Goal: make each scene self-contained and ready for production-grade timing, assets, transforms, and effects.

### Implement

- [ ] Define a single canonical `Scene` type.
- [ ] Ensure each scene owns:
  - [ ] `id`
  - [ ] `title`
  - [ ] `duration`
  - [ ] `timeline`
  - [ ] `captionBlocks`
  - [ ] `imageAssets`
  - [ ] `videoAssets`
  - [ ] `sfxTriggers`
  - [ ] `transitions`
  - [ ] `graphics`
  - [ ] `camera`
  - [ ] `state`
- [ ] Add scene-local timeline support:
  - [ ] `start`
  - [ ] `end`
  - [ ] `duration`
  - [ ] local time calculation
  - [ ] scene progress calculation
- [ ] Keep global project timeline derived from scene order.
- [ ] Add schema migration helpers for old project files.
- [ ] Keep `version: 1` import compatible.
- [ ] Keep `version: 2` import/export compatible.

### Test

- [ ] Run `npm run build`.
- [ ] Import an old `version: 1` JSON.
- [ ] Import current `sample-project.json`.
- [ ] Export project JSON and re-import it.
- [ ] Preview every scene after import.

### Verify

- [ ] Scene timing is correct.
- [ ] Scene duration changes do not break total duration.
- [ ] Scene-local effects use local time, not global time.
- [ ] Missing optional scene fields receive safe defaults.

## Phase 5: Scene Timeline Engine

Goal: every scene should have its own timeline that controls captions, images, videos, transitions, graphics, and effects.

### Implement

- [ ] Add a scene-local timeline model:
  - [ ] `layers`
  - [ ] `elements`
  - [ ] `keyframes`
  - [ ] `effects`
  - [ ] `transitions`
- [ ] Support layer types:
  - [ ] caption
  - [ ] image
  - [ ] video
  - [ ] graphic asset
  - [ ] SFX
- [ ] Add element timing:
  - [ ] `start`
  - [ ] `end`
  - [ ] `duration`
  - [ ] `enter`
  - [ ] `exit`
- [ ] Add keyframe transforms:
  - [ ] x
  - [ ] y
  - [ ] scale
  - [ ] rotation
  - [ ] opacity
  - [ ] blur
  - [ ] brightness
  - [ ] contrast
  - [ ] saturation
  - [ ] crop
  - [ ] zIndex
- [ ] Add easing support:
  - [ ] linear
  - [ ] easeIn
  - [ ] easeOut
  - [ ] easeInOut
  - [ ] easeOutCubic
  - [ ] spring approximation
- [ ] Keep simple scene controls working while advanced timeline fields are introduced.

### Test

- [ ] Run `npm run build`.
- [ ] Create a test scene with 3 timed layers.
- [ ] Verify each layer enters and exits at the correct local time.
- [ ] Verify keyframes interpolate correctly.
- [ ] Verify scene transitions still apply to the full scene.

### Verify

- [ ] Timeline does not drift over 60+ second projects.
- [ ] Timeline state resets correctly when switching scenes.
- [ ] Pausing and scrubbing show the correct frame.
- [ ] Exported video matches preview timing.

## Phase 6: Caption Engine Upgrade

Goal: production-grade caption control with per-word, per-group, and per-scene styling.

### Implement

- [ ] Support multiple caption blocks per scene.
- [ ] Support active word groups per caption block.
- [ ] Support non-overlapping word group stepping.
- [ ] Support per-word styles:
  - [ ] color
  - [ ] gradient
  - [ ] stroke
  - [ ] glow
  - [ ] scale
  - [ ] rotation
  - [ ] emphasis animation
- [ ] Support caption block layout:
  - [ ] max words per line
  - [ ] max lines
  - [ ] line balancing
  - [ ] text alignment
  - [ ] safe-area position
  - [ ] x/y offset
- [ ] Support caption animation per block:
  - [ ] entrance
  - [ ] exit
  - [ ] active word animation
  - [ ] motion blur flag
- [ ] Keep existing text controls available per scene.

### Test

- [ ] Run `npm run build`.
- [ ] Test active word count 1, 2, 3, 4, and 8.
- [ ] Test long multi-line captions.
- [ ] Test left, center, right, and justify alignment.
- [ ] Test per-word colors.
- [ ] Test gradient text.
- [ ] Export a video and compare caption positions with preview.

### Verify

- [ ] Word groups never overlap unless explicitly configured.
- [ ] Captions stay inside safe areas.
- [ ] Text does not clip on mobile preview sizes.
- [ ] Export and preview use the same caption layout.

## Phase 7: Local Asset Management

Goal: support local SFX/video assets and external image links in a predictable, production-safe way.

### Implement

- [ ] Add an asset registry for the project.
- [ ] Support local file paths for:
  - [ ] SFX
  - [ ] music
  - [ ] voiceover
  - [ ] video assets
  - [ ] overlay assets
- [ ] Support external image URLs for:
  - [ ] Unsplash
  - [ ] Pexels
  - [ ] Pixabay
  - [ ] direct CDN image URLs
- [ ] Do not generate graphics procedurally in code for production visuals.
- [ ] Require all reusable graphics to be external asset files.
- [ ] Add asset validation:
  - [ ] path exists for local files
  - [ ] file extension supported
  - [ ] size warning
  - [ ] CORS warning for remote images
  - [ ] failed asset fallback
- [ ] Add asset preview thumbnails where practical.
- [ ] Cache loaded image assets during preview/export.
- [ ] Cache local videos during preview/export.

### Test

- [ ] Run `npm run build`.
- [ ] Load local SFX from `sound-effects/`.
- [ ] Load a local video file.
- [ ] Load an Unsplash image URL.
- [ ] Test an invalid local path.
- [ ] Test a broken image URL.
- [ ] Export with a valid remote image.

### Verify

- [ ] Broken assets do not crash preview.
- [ ] Broken assets do not crash export.
- [ ] Error messages identify the failed asset.
- [ ] Fallback images are attempted in rank order.

## Phase 8: Multi-Image Scene System

Goal: support up to 10 images per scene, each with full timing, transforms, and effects.

### Implement

- [ ] Replace single B-roll image behavior with scene image layers.
- [ ] Support up to 10 image assets per scene.
- [ ] Each image should support:
  - [ ] start time
  - [ ] end time
  - [ ] zIndex
  - [ ] fit: cover / contain / stretch
  - [ ] crop
  - [ ] opacity
  - [ ] blur
  - [ ] darken
  - [ ] vignette
  - [ ] entrance effect
  - [ ] exit effect
  - [ ] keyframe transforms
- [ ] Add image entrance effects:
  - [ ] fade
  - [ ] zoom
  - [ ] slide
  - [ ] blur in
  - [ ] flash in
  - [ ] whip in
- [ ] Add image exit effects:
  - [ ] fade
  - [ ] zoom out
  - [ ] slide out
  - [ ] blur out
  - [ ] flash out
  - [ ] whip out
- [ ] Add per-image Ken Burns controls.
- [ ] Keep legacy `broll` import by mapping it into image layer 1.

### Test

- [ ] Run `npm run build`.
- [ ] Create a scene with 1 image.
- [ ] Create a scene with 3 images.
- [ ] Create a scene with 10 images.
- [ ] Verify each image timing.
- [ ] Verify zIndex ordering.
- [ ] Export a project with multiple images.

### Verify

- [ ] Preview and export match.
- [ ] 10 images do not break scene playback.
- [ ] Asset failures only remove the failed image layer.
- [ ] Legacy B-roll projects still render.

## Phase 9: Video Asset Layers

Goal: support local video files as scene layers while keeping images as external links.

### Implement

- [ ] Support local video file paths only.
- [ ] Add video layer type.
- [ ] Each video layer should support:
  - [ ] local path
  - [ ] start time
  - [ ] end time
  - [ ] trim start
  - [ ] trim end
  - [ ] playback rate
  - [ ] muted flag
  - [ ] opacity
  - [ ] fit
  - [ ] crop
  - [ ] keyframe transforms
  - [ ] entrance effect
  - [ ] exit effect
- [ ] Add video frame sampling for canvas preview.
- [ ] Add video frame sampling for export.
- [ ] Add error handling for unsupported formats.

### Test

- [ ] Run `npm run build`.
- [ ] Load a short local MP4.
- [ ] Load a long local MP4.
- [ ] Test trim start/end.
- [ ] Test scene-local timing.
- [ ] Export a video with a local video layer.

### Verify

- [ ] Video frames render at the correct time.
- [ ] Video layers do not freeze during export.
- [ ] Invalid paths show a clear warning.
- [ ] Export does not include remote video links.

## Phase 10: Chroma Key Support

Goal: support green-screen removal for image/video layers.

### Implement

- [ ] Add chroma key settings per visual layer:
  - [ ] enabled
  - [ ] key color
  - [ ] similarity
  - [ ] smoothness
  - [ ] spill reduction
  - [ ] edge softness
- [ ] Apply chroma key in preview renderer.
- [ ] Apply chroma key in export renderer.
- [ ] Add presets:
  - [ ] green screen
  - [ ] blue screen
  - [ ] custom color
- [ ] Add a UI toggle and controls per layer.

### Test

- [ ] Run `npm run build`.
- [ ] Test green-screen image.
- [ ] Test green-screen video.
- [ ] Test blue-screen image.
- [ ] Export chroma-keyed visual layer.

### Verify

- [ ] Green background is removed cleanly.
- [ ] Subject edges remain acceptable.
- [ ] Preview and export match.
- [ ] Chroma key can be disabled per layer.

## Phase 11: External Visual Asset Library

Goal: make asset selection and replacement manageable for real production work.

### Implement

- [ ] Add project-level asset library.
- [ ] Add scene-level asset references by ID.
- [ ] Add asset replacement UI.
- [ ] Add asset usage display:
  - [ ] used scenes
  - [ ] duration
  - [ ] missing status
  - [ ] source/license
- [ ] Add image candidate fallback UI.
- [ ] Support up to 10 image candidates per scene.
- [ ] Keep source metadata:
  - [ ] provider
  - [ ] title
  - [ ] page URL
  - [ ] image URL
  - [ ] license
  - [ ] creator

### Test

- [ ] Run `npm run build`.
- [ ] Import project with 10 image candidates.
- [ ] Replace an image asset.
- [ ] Export project JSON.
- [ ] Re-import exported JSON.

### Verify

- [ ] Asset references remain stable.
- [ ] Replacing an asset updates all linked scenes if intended.
- [ ] License/source metadata survives export/import.

## Phase 12: Scene Graphics As External Assets

Goal: stop relying on code-generated graphics for production visual overlays.

### Implement

- [ ] Define external graphic asset types:
  - [ ] arrow PNG/SVG
  - [ ] circle PNG/SVG
  - [ ] underline PNG/SVG
  - [ ] warning label PNG/SVG
  - [ ] stat card PNG/SVG template asset
  - [ ] quote card PNG/SVG template asset
  - [ ] HUD overlay PNG/SVG
- [ ] Allow each graphic layer to reference an external asset path.
- [ ] Support transforms for graphic layers.
- [ ] Support entrance/exit effects for graphic layers.
- [ ] Keep old code-generated graphics as compatibility fallback only if needed.
- [ ] Add migration path from old `graphics` objects to external graphic layers.

### Test

- [ ] Run `npm run build`.
- [ ] Add an external arrow asset.
- [ ] Add an external underline asset.
- [ ] Add an external warning label asset.
- [ ] Export a scene with graphic assets.

### Verify

- [ ] No production visual depends on browser procedural drawing.
- [ ] Graphic asset positioning matches preview/export.
- [ ] Missing graphic assets show warnings.

## Phase 13: Scene Transition System

Goal: support granular scene-level and element-level transitions.

### Implement

- [ ] Keep scene transition in/out controls.
- [ ] Add transition keyframes to scene timeline.
- [ ] Add transition types:
  - [ ] cut
  - [ ] fade
  - [ ] zoom
  - [ ] slide
  - [ ] blur
  - [ ] flash
  - [ ] glitch
  - [ ] whip
  - [ ] luma-style approximation
- [ ] Add transition direction.
- [ ] Add transition easing.
- [ ] Add transition duration validation.
- [ ] Add element-level transition overrides.

### Test

- [ ] Run `npm run build`.
- [ ] Test every scene transition.
- [ ] Test every direction.
- [ ] Test scene transitions with B-roll.
- [ ] Test scene transitions with captions.
- [ ] Export a project using multiple transition types.

### Verify

- [ ] Transitions affect the correct scene range.
- [ ] Transitions do not break caption timing.
- [ ] Preview and export match.

## Phase 14: Transform Keyframe Editor

Goal: give granular control over every element in every scene.

### Implement

- [ ] Add keyframe list UI per selected element.
- [ ] Support adding/removing keyframes.
- [ ] Support editing keyframe time.
- [ ] Support editing keyframe values:
  - [ ] x
  - [ ] y
  - [ ] scale
  - [ ] rotation
  - [ ] opacity
  - [ ] blur
  - [ ] crop
- [ ] Support easing per keyframe segment.
- [ ] Add reset keyframes button.
- [ ] Add copy/paste keyframes between elements.
- [ ] Add validation for invalid times.

### Test

- [ ] Run `npm run build`.
- [ ] Add keyframes to a caption.
- [ ] Add keyframes to an image.
- [ ] Add keyframes to a video.
- [ ] Copy/paste keyframes.
- [ ] Export keyframed scene.

### Verify

- [ ] Keyframes interpolate correctly.
- [ ] Keyframes stay within scene duration.
- [ ] Exported motion matches preview.

## Phase 15: Local SFX System

Goal: use real local SFX files with scene and word-group triggers.

### Implement

- [ ] Use local files from `sound-effects/`.
- [ ] Add configurable SFX directory path.
- [ ] Add SFX asset registry.
- [ ] Add SFX triggers:
  - [ ] scene start
  - [ ] scene end
  - [ ] word group hit
  - [ ] graphic reveal
  - [ ] image entrance
  - [ ] transition
- [ ] Add SFX settings:
  - [ ] file path
  - [ ] volume
  - [ ] start offset
  - [ ] trim start
  - [ ] trim end
  - [ ] cooldown
- [ ] Prevent overlapping SFX where configured.
- [ ] Keep SFX preview using real audio files.
- [ ] Keep export using the same audio timing where supported.

### Test

- [ ] Run `npm run build`.
- [ ] Trigger SFX on each word group.
- [ ] Trigger SFX on scene start.
- [ ] Trigger SFX on graphic reveal.
- [ ] Pause preview and verify SFX stops.
- [ ] Resume preview and verify timing remains correct.

### Verify

- [ ] SFX paths are local only.
- [ ] Missing SFX files do not crash preview/export.
- [ ] SFX trigger timing matches captions.

## Phase 16: Voiceover Preview Sync

Goal: support imported MP3 voiceover for preview sync without forcing audio into every export phase.

### Implement

- [ ] Support local voiceover MP3 import.
- [ ] Show voiceover duration.
- [ ] Add play/pause/scrub sync with preview.
- [ ] Add optional word timing import.
- [ ] Add fallback estimated word timings if no timing file exists.
- [ ] Allow scene duration adjustment based on voiceover sections.
- [ ] Keep voiceover preview separate from scene visual rendering logic.

### Test

- [ ] Run `npm run build`.
- [ ] Import an MP3.
- [ ] Play preview.
- [ ] Pause preview.
- [ ] Scrub preview.
- [ ] Verify captions and voiceover stay aligned.

### Verify

- [ ] Voiceover does not autoplay unexpectedly.
- [ ] Voiceover stops when preview stops.
- [ ] Voiceover sync does not affect JSON import/export unless saved intentionally.

## Phase 17: Project JSON V3 Schema

Goal: formalize the next production schema without breaking existing projects.

### Implement

- [ ] Add `version: 3`.
- [ ] Add `schema: "scene-production-v3"`.
- [ ] Keep import compatibility:
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
- [ ] Add scene timeline fields.
- [ ] Add image layer fields.
- [ ] Add video layer fields.
- [ ] Add local asset references.
- [ ] Add chroma key fields.
- [ ] Add quality controls.
- [ ] Update `sample-project.json`.
- [ ] Add a separate `schema.json` or update existing `shema.json` after confirming filename.

### Test

- [ ] Run `npm run build`.
- [ ] Validate `sample-project.json` with `jq`.
- [ ] Import version 1 project.
- [ ] Import version 2 project.
- [ ] Import version 3 project.
- [ ] Export version 3 project.
- [ ] Re-import exported project.

### Verify

- [ ] No old project becomes unusable.
- [ ] Schema fields match app state.
- [ ] Required fields are documented.
- [ ] Optional fields have defaults.

## Phase 18: Renderer Production Hardening

Goal: make preview and export deterministic, stable, and matching.

### Implement

- [ ] Use the same render pipeline for preview and export.
- [ ] Separate render state from UI state.
- [ ] Add deterministic asset load order.
- [ ] Add frame-level render warnings.
- [ ] Add missing asset placeholders for preview.
- [ ] Add export-safe fallbacks.
- [ ] Add memory cleanup after export.
- [ ] Add long-video export safeguards.
- [ ] Add progress reporting for export.

### Test

- [ ] Run `npm run build`.
- [ ] Export 15 second project.
- [ ] Export 60 second project.
- [ ] Export 90+ second project.
- [ ] Export project with many images.
- [ ] Export project with local video.

### Verify

- [ ] Export does not fail silently.
- [ ] Export warnings are visible.
- [ ] Long exports complete or fail with actionable reason.
- [ ] Preview and export frames match.

## Phase 19: UI Organization

Goal: keep the app usable as scene complexity grows.

### Implement

- [ ] Keep left panel focused on scenes.
- [ ] Add center preview with compact controls.
- [ ] Add right panel tabs:
  - [ ] Text
  - [ ] Images
  - [ ] Video
  - [ ] Motion
  - [ ] Transitions
  - [ ] SFX
  - [ ] Export
- [ ] Add selected scene summary.
- [ ] Add selected layer summary.
- [ ] Add warnings panel.
- [ ] Add compact timeline view per scene.
- [ ] Add layer visibility toggles.
- [ ] Add layer lock toggles.

### Test

- [ ] Run `npm run build`.
- [ ] Test desktop viewport.
- [ ] Test smaller laptop viewport.
- [ ] Test mobile-width layout if supported.
- [ ] Verify no critical control is unreachable.

### Verify

- [ ] User can manage 20+ scenes.
- [ ] User can manage 10 image layers in one scene.
- [ ] Controls do not overflow unusably.
- [ ] Existing functionality remains accessible.

## Phase 20: Import/Export Reliability

Goal: make project files portable and dependable.

### Implement

- [ ] Add strict project validation before import.
- [ ] Preserve current project if import fails.
- [ ] Show import errors with field paths.
- [ ] Add export project JSON.
- [ ] Add import project JSON.
- [ ] Add backup before import.
- [ ] Add autosave to local storage.
- [ ] Add restore last project.
- [ ] Add sample project loader.

### Test

- [ ] Run `npm run build`.
- [ ] Import valid project.
- [ ] Import malformed JSON.
- [ ] Import unsupported schema version.
- [ ] Export and re-import.
- [ ] Reload browser and restore autosave.

### Verify

- [ ] Import failure does not destroy current work.
- [ ] Exported project includes all scene data.
- [ ] Asset references survive export/import.
- [ ] Validation messages are understandable.

## Phase 21: Export Targets

Goal: support reliable production exports.

### Implement

- [ ] Keep MP4 export.
- [ ] Keep alpha WebM export if supported.
- [ ] Keep alpha MOV export if supported.
- [ ] Add export presets:
  - [ ] YouTube Shorts 1080x1920
  - [ ] Instagram Reels 1080x1920
  - [ ] Square 1080x1080
  - [ ] Landscape 1920x1080
- [ ] Add bitrate controls.
- [ ] Add FPS controls.
- [ ] Add transparent background warnings.
- [ ] Add unsupported-browser warnings.
- [ ] Add local asset missing warnings before export.

### Test

- [ ] Run `npm run build`.
- [ ] Export MP4.
- [ ] Export alpha WebM.
- [ ] Export alpha MOV if supported.
- [ ] Export with transparent background.
- [ ] Export with solid background.
- [ ] Export with image layers.
- [ ] Export with video layers.

### Verify

- [ ] Output resolution is correct.
- [ ] Output FPS is correct.
- [ ] Output duration is correct.
- [ ] Alpha export has transparent background where supported.
- [ ] Exported file opens in a video editor.

## Phase 22: Quality Controls

Goal: add automated checks that help create premium, high-retention videos.

### Implement

- [ ] Add project quality report.
- [ ] Check caption length.
- [ ] Check visual change frequency.
- [ ] Check missing B-roll.
- [ ] Check missing asset URLs.
- [ ] Check missing local paths.
- [ ] Check safe-area violations.
- [ ] Check scenes without motion.
- [ ] Check scenes without visual purpose.
- [ ] Check repeated animation overuse.
- [ ] Check too many words per scene.

### Test

- [ ] Run `npm run build`.
- [ ] Run quality report on sample project.
- [ ] Run quality report on a weak project.
- [ ] Run quality report on a dense project.

### Verify

- [ ] Report gives actionable warnings.
- [ ] Report does not block export unless configured.
- [ ] Report helps improve retention-focused output.

## Phase 23: Testing Foundation

Goal: protect the renderer and schema from regressions.

### Implement

- [ ] Add unit tests for:
  - [ ] scene defaults
  - [ ] schema migration
  - [ ] timeline calculations
  - [ ] keyframe interpolation
  - [ ] word group segmentation
  - [ ] asset validation
- [ ] Add smoke tests for:
  - [ ] app mount
  - [ ] project import
  - [ ] project export
  - [ ] sample project render
- [ ] Add fixture projects:
  - [ ] minimal project
  - [ ] v1 project
  - [ ] v2 project
  - [ ] v3 project
  - [ ] multi-image project
  - [ ] local-video project
  - [ ] broken-assets project

### Test

- [ ] Run unit tests.
- [ ] Run smoke tests.
- [ ] Run `npm run build`.
- [ ] Run `npm audit`.

### Verify

- [ ] Tests catch schema breakage.
- [ ] Tests catch timeline drift.
- [ ] Tests catch import/export loss.
- [ ] Tests are fast enough to run regularly.

## Phase 24: Documentation

Goal: make the app maintainable and easy to use.

### Implement

- [ ] Document project JSON schema.

## Phase 25: Production Readiness Gate

Goal: final checklist before calling the application production-ready.

### Implement

- [ ] Freeze schema version for release.
- [ ] Clean unused code.
- [ ] Remove dead feature flags.
- [ ] Confirm all production visual assets are external files or URLs.
- [ ] Confirm no browser-generated production graphics are required.
- [ ] Confirm local SFX/video path behavior is documented.
- [ ] Confirm export presets are stable.
- [ ] Confirm sample project represents real production usage.

### Test

- [ ] Run full build.
- [ ] Run audit.
- [ ] Run all automated tests.
- [ ] Import sample project.
- [ ] Export 60+ second MP4.
- [ ] Export transparent format.
- [ ] Test project with 20+ scenes.
- [ ] Test project with 10 images in one scene.
- [ ] Test local video layer.
- [ ] Test chroma key.

### Verify

- [ ] App can produce a complete production-ready vertical video.
- [ ] App can recover from missing assets.
- [ ] App can load and save project files safely.
- [ ] App can handle long projects without breaking.
- [ ] Preview and export are visually consistent.

## Recurring Workflow For Every Pull/Change

- [ ] Understand current behavior before editing.
- [ ] Make the smallest useful change.
- [ ] Keep existing functionality working.
- [ ] Run `npm run build`.
- [ ] Run targeted tests for the changed area.
- [ ] Import `sample-project.json`.
- [ ] Smoke test preview.
- [ ] Smoke test project JSON export/import.
- [ ] Update this TODO when work is completed.
