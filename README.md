# Mobeet Create Post Media Editor

Production **WebView bundle** for the Mobeet create-post flow (`mbt/`). It renders GPU filter preview (Three.js / R3F), runs in-WebView export (WebCodecs + canvas), and talks to React Native over `postMessage`.

This package is **not** a standalone app. It ships as a single **`index.html`** (Vite + `vite-plugin-singlefile`), delivered OTA and loaded from disk in the WebView — not embedded in the APK/IPA.

| | |
| --- | --- |
| **Folder name** | `frontend_threejs_filter_processor_preview` (historical) |
| **RN host** | `mbt/app/features/createPost/` → `MediaProcessorMain` |
| **Deep docs** | [`../mbt/docs/createPost/CreatePostMediaFilterPipeline.md`](../mbt/docs/createPost/CreatePostMediaFilterPipeline.md), [`../mbt/docs/createPost/CreatePost_MediaEditor_Tasks.md`](../mbt/docs/createPost/CreatePost_MediaEditor_Tasks.md) |

## Table of contents

- [What it does](#what-it-does)
- [How it reaches the phone](#how-it-reaches-the-phone)
- [Layout modes (`exportMode`)](#layout-modes-exportmode)
- [Source layout](#source-layout)
- [RN ↔ Web protocol](#rn--web-protocol)
- [Export](#export)
- [Preview quality](#preview-quality)
- [Tech stack](#tech-stack)
- [Development](#development)
- [Publish (OTA)](#publish-ota)
- [Fonts OTA (separate)](#fonts-ota-separate)
- [Scripts](#scripts)
- [Status](#status)
- [Contributing & license](#contributing--license)

## What it does

- **GPU filters** — GLSL pipeline: brightness, contrast, saturation, gamma, hue, color balance, curves (512-sample LUT), shadows/highlights, temperature, blur, unsharp (`src/assets/shaders.ts`).
- **Photo & video** — Same WebGL canvas; video uses `VideoTexture` for preview and `VideoFrameTexture` + sync `gl.render` for export.
- **Multi-media carousel** — Snap-scroll; per-slide filters, adjust transforms, and editor sliders.
- **Adjust menu** — CSS preview frame math aligned 1:1 with R3F `FilteredMedia` plane layout (`useAdjustPreviewLayout`). Drag/pinch on media uses `useGesture` with local transform state (reference pattern for text layers).
- **Text layers** — R3F text sprites on the export canvas (`TextLayersCanvas`); editing UI in menus + `TextContentOverlayArea`. Per-layer drag/pinch via `TextLayerGestureSurface` (same gesture model as Adjust). Font files via separate Fonts OTA on RN.
- **Text flow UX** — Full-screen overlay (`TextContentOverlayArea`) for editing; **transparent** `TextMenu` footer (`bg-transparent`, `pointer-events-none` shell, `pointer-events-auto` on toolbar buttons) so the toolbar does not block the overlay/canvas underneath.
- **Tags** — Per-media user tags on **images only** (not video); `TAG_SEARCH` / `TAG_SEARCH_RESULT` in `AdjustMenu`.
- **Save & Post export** — Encode in WebView; RN handles gallery write (stream/chunk) or S3 handoff (`s3Url` only for post).

**UI placeholders (not create-post MVP):** sticker and audio entries use `PlaceholderFeatureMenu` (back + empty state).

## How it reaches the phone

```text
mbt/ (Expo)
  create-post → MediaProcessorMain
    ├── editorUpdater     OTA: manifest.json → cache index.html → file:// WebView
    ├── mediaServer       localhost HTTP → media URIs in hydration (no base64 in payload)
    └── WebView           loads cached editor HTML
```

When you change hydration shape, `postMessage` types, or export contracts, update **this repo and `mbt/`** in the same change set (`webViewHelpers.ts`, `webViewTypes.ts`, bridge handlers).

## Layout modes (`exportMode`)

Hydration sends `exportMode: 'post' | 'reel' | 'story'` (replaces legacy `post: boolean`).

| Mode | Carousel fit | Aspect | Export sizes (full) | Editor UI in this bundle |
| ---- | ------------ | ------ | ------------------- | ------------------------- |
| `post` | `cover` | 4:5 | 1080×1350 | **Shipped** — `PostEditor` |
| `reel` / `story` | `contain` | 9:16 | 1080×1920 | Hydration + export types supported; shell shows loader until a dedicated editor is added |

Post **video** encode: **1000×1250** (1 video) / **960×1200** (2+ videos) @ **4.8 Mbps**; photos stay **1080×1350**. Reel/story batch: **960×1712**. See `src/features/post/types/exportTypes.ts`.

Invalid `exportMode` in hydration logs a warning and defaults to `'post'`.

## Source layout

The app is split into a thin **shell** (`App.tsx`), **post feature** code, and **shared** RN/hydration utilities. Future `reel` / `story` features can mirror `features/post/` without growing `App.tsx`.

```text
src/
  App.tsx                              Boot: logging, hydration hooks, loader gate,
                                       usePostRnDocumentHandler; mounts PostEditor when ready
  main.tsx                             Vite entry

  features/post/
    PostEditor.tsx                     Post exportMode: canvas + menus (exportMode === 'post')
    constants/textFlowButtons.ts       Buttons that keep text overlay + footer open
    bridge/
      hooks/usePostRnDocumentHandler.ts  document 'message' listener (save/post export, patches)
      helpers/postBridge.ts              Post batch orchestration
      helpers/postExportRnMessages.ts    Web → RN post export messages (split for circular-deps)
      helpers/saveBridge.ts              Save export chunks → RN
      helpers/saveExportDiagnostics.ts
      helpers/saveExportUserMessage.ts
    components/canvas/
      FilteredMedia.tsx                R3F filter plane (WebGL)
      MediaCanvas.tsx / MediaCanvasContainer.tsx / MediaComponent.tsx
      TextLayersCanvas.tsx             Text sprites on export canvas
    components/menus/
      BottomBar.tsx, filter/, adjust/, editor/, text/
      shared/PlaceholderFeatureMenu.tsx
      text/TextContentOverlayArea.tsx  Full-screen text edit overlay
      text/TextLayerGestureSurface.tsx Per-layer useGesture (Adjust-style)
      text/shared/                     Footer chips, horizontal scroll helpers
    helpers/
      adjust/                          Preview transform, video playback time
      canvas/                          Hydration apply, export registries, frame driver
      export/                          Save slide, MP4 encode, upload helpers
      filter/                          LUT / thumbnail helpers
      postExport/                      Post batch encode + upload
      text/                            Line wrap, gesture coords, trash hit-test
    hooks/
      adjust/                          useAdjustPreviewLayout, useMenuPreviewVideo
      canvas/                          Media verify, element size, active index
      text/                            useThrottledHexCommit; pointer type for trash test
      useAdjustMenusRnSync.ts          ADJUST_MENUS_OPEN / MENUS_CLOSE → RN
    types/exportTypes.ts               Dimensions, DPR cap, export payloads

  shared/
    helpers/hydrationBridge.ts         applyHydrationFromPayload, postMessageToRN
    hooks/
      useMediaReadyHydration.ts        __EXPO_MEDIA__ + mediaReady
      useRnCapabilitiesProbe.ts        CAPABILITIES on mount; WEB_READY after hydration
      useEditorLogging.ts              SET_LOG_CONFIG, console → RN
      useDevMockHydration.ts           Optional browser-only mock (see Development)
    types/webBridgeTypes.ts            HydrationPayload, PatchPayload, Insets
    types/exportMode.ts                ExportMode + isPostLayoutMode
    types/filterTypes.ts
    components/Loader.tsx, ErrorBoundary.tsx, LazySketchColorPicker.tsx, MenuBackButton.tsx
    utils/rnLogger.ts, filter_utils.ts

  store/                               Zustand (appStore + slices)
  assets/shaders.ts
  assets/filters/filterData.ts

scripts/
  generate-manifest.mjs                OTA manifest (sha256) after build
  copy-pages.mjs                       dist → docs/
  generate-fonts-manifest.mjs          Fonts OTA (see OTA_Fonts/)

.fallowrc.json                         Code health / duplication / circular-deps (optional)
```

### Shell vs post feature

| Layer | Responsibility |
| ----- | ---------------- |
| `App.tsx` | Global init, `useMediaReadyHydration`, `useRnCapabilitiesProbe`, `usePostRnDocumentHandler`, wait for `mediaFiles` + `dpr`, then render `PostEditor` when `exportMode === 'post'` |
| `PostEditor` | Menu routing, `MediaComponent`, adjust/tag RN sync |
| `shared/` | Contracts and hydration used by any future export mode |
| `features/post/` | All create-post editor UI and export implementation today |

## RN ↔ Web protocol

**Authoritative lists:** `mbt/docs/createPost/CreatePost_MediaEditor_Tasks.md`, `mbt/app/features/createPost/types/webViewTypes.ts`.

**Contract unchanged** after the folder restructure — only file paths moved.

### Hydration (RN → Web)

RN injects `window.__EXPO_MEDIA__` and fires `mediaReady` before/at `WEB_READY`:

| Field | Notes |
| ----- | ----- |
| `file[]` | `uri` = `file://` / local paths from RN (not base64) |
| `exportMode` | `'post' \| 'reel' \| 'story'` |
| `dpr` | Device pixel ratio for GL |
| `appColors`, `insets` | Theme + safe area |
| `uploadEndpoint` | Optional presigned post URL |
| `production` | Gates RN log forwarding |

Applied in `shared/helpers/hydrationBridge.ts` via `useMediaReadyHydration`.

### Runtime messages

**RN → Web** (handled in `usePostRnDocumentHandler`)

| Type | Purpose |
| ---- | ------- |
| `PATCH_STATE` | Theme / insets patch |
| `MODAL_STATE_CHANGE` | Block interactions while RN modal open |
| `START_SAVE_EXPORT` | Gallery save — active slide, `writePath`, chunk size |
| `START_POST_EXPORT` / `RESUME_POST_EXPORT` | Batch post — file list + presigned upload |
| `CANCEL_POST_EXPORT` | Pause/cancel batch between files |
| `SAVE_EXPORT_COMPLETE` / `SAVE_EXPORT_FAILED` | Save lifecycle |
| `SET_LOG_CONFIG` | Production logging toggle |

**Also on `document`:** `TAG_SEARCH_RESULT` → `AdjustMenu` (not the post handler).

**Web → RN**

| Type | Purpose |
| ---- | ------- |
| `CAPABILITIES` | `{ webCodecs }` on load and after hydration |
| `WEB_READY` | Shell ready after hydration |
| `FILES_LOADED` | Media textures ready — RN may stop media server |
| `REQUEST_SAVE_TO_DEVICE` | User tapped Save |
| `EXPORT_SAVE_STARTED` | Save encode started |
| `SAVE_EXPORT_DATA` / `SAVE_EXPORT_CHUNK` | Encoded bytes or chunks to RN |
| `EXPORT_PROGRESS` | Encode / write / upload progress |
| `POST_EXPORT_ACK` | Post batch accepted |
| `EXPORT_SUCCESS` | Post file done — **`{ s3Url }`** |
| `POST_EXPORT_FAILED` / `SAVE_EXPORT_FAILED` | Errors |
| `ADJUST_MENUS_OPEN` / `MENUS_CLOSE` | UX guards (`useAdjustMenusRnSync`) |
| `BUTTONS_CLICK`, `TAG_SEARCH`, `LOG_ERROR` | Misc |

**Do not use for new work:** native `VideoProcessor` export, base64 hydration, `CURRENT_ACTIVE_VALUES`, `EXPORT_DATA_RECEIVED` blob handoff to native encode.

## Export

| Flow | Trigger | Web behavior | RN outcome |
| ---- | ------- | ------------ | ---------- |
| **Save** | `EditorMenuMain` | `exportActiveSlideForGallery` — active slide | Stream/chunk to device gallery |
| **Post** | `NameAndInputContainer` | `runPostExportBatch(exportMode)` — all slides | PUT to presigned URL → `s3Url` per file → GraphQL |

Video export uses **Mediabunny** decode → `VideoFrameTexture` → filtered `gl.render` per frame (no preview `<video>` seek during encode). Images: filtered canvas → `toBlob` → scale to target dimensions.

## Preview quality

| Knob | Location | Effect |
| ---- | -------- | ------ |
| DPR cap (2×) | `MAX_PREVIEW_DEVICE_PIXEL_RATIO` in `exportTypes.ts` | Sharper GL without 3× buffer cost |
| Photo anisotropy | `FilteredMedia` | Cleaner cover-cropped photos |
| Curve LUT 512 | `createCurveTexture` | Smoother preset curves |
| `u_texel` | `shaders.ts` | Blur/sharpen tied to **source** pixels (media `w`/`h`; export uses frame size) |

Adjust **layout** parity is independent — plane math in `FilteredMedia` + `useAdjustPreviewLayout`.

## Tech stack

| Layer | Library |
| ----- | ------- |
| UI | React 19 |
| 3D | Three.js, React Three Fiber |
| Video encode | Mediabunny, WebCodecs (`VideoEncoder`) |
| State | Zustand, Immer |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` at build time) |
| Gestures | @use-gesture/react |
| Build | Vite 8, vite-plugin-singlefile |
| Runtime | Bun |
| Code health (optional) | fallow — see `.fallowrc.json` |

Production **`docs/index.html`** contains compiled JS/CSS only; Vite, Tailwind plugin, and TypeScript live in **devDependencies** and run at build time.

## Development

```bash
bun install          # full install required for build (includes devDependencies)
bun run dev          # Vite — UI only; no RN bridge or file:// media by default
bun run tsc          # typecheck
bun run lint         # eslint
bun run build        # dist/index.html + manifest.json
```

**Real integration testing** needs the **mbt** dev client: OTA or local `docs/`, `mediaServer`, and WebView `postMessage`.

**Browser-only smoke test (optional):** wire `useDevMockHydration` in `App.tsx` with a local video asset and `HydrationPayload`, or uncomment the inline `DEV_MOCK_HYDRATION` block. Default checkout leaves mock hydration **off** so the shell stays on the loader until RN hydrates (matches production).

## Publish (OTA)

Build locally; deploy **`docs/`** (static). Recommended: **Vercel** — see [`docs/VERCEL_FIREWALL_SETUP.md`](docs/VERCEL_FIREWALL_SETUP.md).

**`mbt/.env` (example):**

```env
EXPO_PUBLIC_EDITOR_MANIFEST_URL=https://your-project.vercel.app/manifest.json
EXPO_PUBLIC_EDITOR_OTA_KEY=<same-secret-as-waf-bypass-header>
```

RN sends `X-Mobeet-Editor-Client` on manifest/HTML fetch (`editorUpdater.ts`).

```bash
bun run pages:publish   # build + copy dist → docs/
git add docs/
git commit -m "chore(editor): publish 0.0.x"
git push
```

Bump **`version`** in `package.json` when you want clients to download a new bundle (manifest sha256 changes).

`docs/index.html` is **generated (~2MB)** — commit only when publishing.

## Fonts OTA (separate)

Editor HTML and **font files** use **different** manifests.

1. Add `.ttf` / `.otf` under `OTA_Fonts/`, bump `OTA_Fonts/version.json`
2. `bun run fonts:ota` → `docs/OTA_Fonts/`
3. Deploy `docs/` with the editor
4. RN: `EXPO_PUBLIC_FONT_MANIFEST_URL` + `fontUpdater.ts`

`pages:publish` does **not** run `fonts:ota`. See [`OTA_Fonts/README.md`](OTA_Fonts/README.md).

## Scripts

| Script | Command |
| ------ | ------- |
| Dev server | `bun run dev` |
| Production build | `bun run build` |
| Typecheck | `bun run tsc` |
| Lint | `bun run lint` |
| Format | `bun run format` |
| Preview build | `bun run preview` |
| Copy build → `docs/` | `bun run pages:copy` |
| Build + copy | `bun run pages:publish` |
| Fonts manifest | `bun run fonts:ota` |

Before a PR: **`bun run tsc`** and **`bun run lint`**.

Optional: **`bunx fallow`** (or add a script) for duplication / circular dependency checks per `.fallowrc.json`.

## Status

| Area | Status |
| ---- | ------ |
| GPU preview (photo / video) | Shipped |
| Carousel, filters, adjust, editor | Shipped |
| `exportMode` layout (post / reel / story) | Types + hydration shipped; **UI** only for `post` |
| Hydration via `__EXPO_MEDIA__` + local URIs | Shipped |
| Save export (WebView → RN gallery) | Shipped |
| Post export (WebView encode → S3 → `s3Url`) | Shipped |
| Single-file OTA + `file://` WebView | Shipped |
| Text on canvas + text menus + transparent toolbar | Shipped (device QA ongoing) |
| Text layer gestures (Adjust-style) | Shipped (device QA ongoing) |
| Feature-based `src/` layout (`features/post`, `shared`) | Shipped |
| Fonts OTA (RN) | Shipped (separate manifest) |
| Stickers / audio | Placeholder menus only |
| Reel / story editor shells | Not yet — loader after hydration |

## Contributing & license

1. Branch from your team integration branch.
2. Coordinate **protocol and hydration** changes with **`mbt/`**.
3. Run **`bun run tsc`** and **`bun run lint`** before opening a PR.
4. Update **`mbt/docs/createPost/`** when message contracts change.
5. Update **this README** when you add export modes, move bridge code, or change folder conventions.

**License:** Mobeet Technologies Private Limited — Proprietary. See [LICENSE](./LICENSE). Licensing: **mobeetdotcom@gmail.com**

**Author:** Atanu Debbarma · **Contributors:** Abhijit Sinha, Kuchuk Debbarma
