# Mobeet Create Post Media Editor

Production WebView bundle for the **Mobeet** create-post flow. It provides real-time GPU filter and adjustment preview, in-WebView export (WebCodecs / canvas), and a bidirectional bridge to the React Native host app in **`mbt/`**.

This package is **not** a standalone product. It ships as a single-file `index.html` (Vite + `vite-plugin-singlefile`), delivered to the app over the air and loaded from disk — not bundled inside the APK/IPA.

**Planning docs:** [`../plan_docs/CreatePost_MediaEditor_Tasks.md`](../plan_docs/CreatePost_MediaEditor_Tasks.md), [`../plan_docs/Technical_Requirements.md`](../plan_docs/Technical_Requirements.md)

## Table of contents

- [Overview](#overview)
- [Relationship to mbt](#relationship-to-mbt)
- [Features](#features)
- [Architecture](#architecture)
- [RN ↔ Web protocol](#rn--web-protocol)
- [Export modes](#export-modes)
- [Tech stack](#tech-stack)
- [Development](#development)
- [Scripts](#scripts)
- [Project status](#project-status)
- [Contributing](#contributing)
- [License](#license)

## Overview

| Aspect | Detail |
| ------ | ------ |
| **Host** | Mobeet Expo app (`mbt/`) — `MediaProcessorMain` WebView |
| **Delivery** | GitHub Pages `index.html` + `manifest.json`; RN `editorUpdater` caches to sandbox; WebView `source={{ uri: file://... }}` |
| **Preview** | Three.js / React Three Fiber + GLSL shaders on photos and video |
| **Export** | In-WebView encode (WebCodecs for video, `canvas.toBlob` for images) — **not** native FFmpeg / `VideoProcessor` |
| **Build output** | One self-contained `index.html` (JS, CSS, fonts, assets inlined) |

Legacy paths (`window.__EXPO_MEDIA__`, `PATCH_STATE`, `CURRENT_ACTIVE_VALUES` for native export) are being removed as part of the media-editor rollout. See plan docs Phase 5+.

## Relationship to mbt

```
mbt/ (React Native)
  └── create-post → MediaProcessorMain
        ├── editorUpdater (OTA cache, manifest sha256)
        ├── mediaServer (localhost HTTP → HYDRATE URLs)
        └── WebView → this repo's index.html (file://)
```

When you change `postMessage` types or hydration shape, update **both** this repo and `mbt/app/features/createPost/` (and `webViewHelpers.ts`) in the same change set.

## Features

- **Real-time GPU filters** — GLSL pipeline (brightness, contrast, saturation, gamma, hue, color balance, curves, shadows/highlights, temperature, blur, unsharp mask).
- **Photo and video** — Image textures and HTML5 video on the same WebGL canvas.
- **Multi-media carousel** — Snap-scroll for multiple attachments per post.
- **Filter presets** — Categorized LUT-style presets.
- **Adjust menu** — Per-media sliders, background color; **per-media user tags on images only** (not video).
- **Editor menu** — Per-media editor controls with live preview.
- **Post / Story modes** — Layout and aspect ratio for post vs story.
- **RN ↔ Web bridge** — Typed `postMessage` protocol (hydration, export, save, modals, theme).
- **Single-file build** — Entire app in one HTML file for OTA and WebView load.

**Deferred / UI only:** text overlays, stickers, audio (menus present; not part of create-post MVP).

## Architecture

```
React Native (mbt/)
    │
    │  OTA: manifest.json → cache index.html → file:// WebView
    │  Runtime: mediaServer → HYDRATE (http://127.0.0.1/... URLs)
    │
    ▼
App.tsx  ──  Zustand (appStore)
    │            ├── fileSlice, buttonSlices, filterSlice
    │            ├── editorSlice, adjustSlice
    │
    ├── MediaComponent → MediaCanvasContainer → MediaCanvas
    │       └── FilteredMedia (ShaderMaterial + shaders.ts)
    │
    └── Menus (BottomBar, FilterMenu, AdjustMenu, EditorMenu, …)
```

Export helpers live under `src/` (e.g. `exportMedia`, `uploadExport`) as implementation progresses; see Tasks Phases 8–10.

## RN ↔ Web protocol

Authoritative message list: **`plan_docs/Technical_Requirements.md`** §4 and **`CreatePost_MediaEditor_Tasks.md`** Phase 5.

### RN → Web

| Message | Purpose |
| ------- | ------- |
| `HYDRATE` | Initial media (`http://127.0.0.1/...`) |
| `UPDATE_ASSETS` | Add more media from gallery |
| `UPDATE_FILTER_SETTINGS` | Theme colors, safe area insets |
| `START_SAVE_EXPORT` | Gallery save — `{ saveUrl, uploadToken, … }` |
| `START_EXPORT_VIDEO` / `START_EXPORT_IMAGE` | Post export — presigned URL per file |
| `PAUSE_EXPORT` / `RESUME_EXPORT` | App background handling |

### Web → RN

| Message | Purpose |
| ------- | ------- |
| `CAPABILITIES` | `{ webCodecs }` on mount |
| `WEB_READY` | Editor shell ready (no media yet) |
| `FILES_LOADED` | Media in memory — RN may stop read server |
| `REQUEST_SAVE_TO_DEVICE` | User tapped Save (active slide) |
| `EXPORT_PROGRESS` | Encode / upload progress |
| `SAVE_EXPORT_COMPLETE` / `SAVE_EXPORT_FAILED` | Gallery save result |
| `EXPORT_SUCCESS` / `IMAGE_EXPORT_SUCCESS` | Post — **`{ s3Url }` only** |
| `EXPORT_FAILED` | Export error |
| `TAG_SEARCH` / `TAG_SEARCH_CANCEL` | Image tag UX |
| `ADJUST_MENUS_OPEN` / `MENUS_CLOSE` | Block post while editing |
| `BUTTONS_CLICK` | Close / add more |
| `LOG_ERROR` | Forward web errors |

**Retired (do not document for new work):** `window.__EXPO_MEDIA__`, `mediaReady`, `PATCH_STATE`, `CURRENT_ACTIVE_VALUES`, `EXPORT_DATA_RECEIVED`, `SAVE_DATA_RECEIVED` for native/blob handoff.

## Export modes

| Mode | Trigger (RN) | Output |
| ---- | -------------- | ------ |
| **Save** | `EditorMenuMain` — active slide only | Encoded bytes streamed `POST` to RN localhost → device gallery; small `postMessage` metadata |
| **Post** | `NameAndInputContainer` — all attachments | Web PUT to presigned S3 → RN receives `s3Url` strings → `createPost` GraphQL |

Post MVP output size: **864×1080** (4:5). See Tasks §9–10.

## Tech stack

| Layer | Library |
| ----- | ------- |
| UI | React 19 |
| 3D / WebGL | Three.js, React Three Fiber |
| State | Zustand, Immer |
| Styling | Tailwind CSS v4 |
| Gestures | @use-gesture/react |
| Animations | @react-spring/web |
| Build | Vite, vite-plugin-singlefile |
| Runtime | Bun |

## Development

```bash
bun install
bun run dev      # browser only — quick UI work
bun run build    # dist/index.html (single file)
```

For real media, filters, and bridge behavior, test inside the **mbt** dev client WebView after pointing it at your built or cached `index.html`. The dev server does not replicate RN `mediaServer`, OTA cache, or presigned upload.

Optional: uncomment mock hydration in `App.tsx` for isolated browser testing (not a substitute for RN integration).

## Scripts

| Script | Command |
| ------ | ------- |
| Dev server | `bun run dev` |
| Production build | `bun run build` |
| Typecheck | `bun run tsc` |
| Lint | `bun run lint` |
| Format | `bun run format` |
| Preview build | `bun run preview` |

Before a PR: run **`bun run tsc`** and **`bun run lint`**.

## Project status

| Area | Status |
| ---- | ------ |
| GPU preview (photo / video) | Shipped |
| Multi-media carousel, filters, adjust, editor menus | Shipped |
| Single-file build | Shipped |
| OTA delivery + `file://` load (no APK bundle) | Planned — Tasks Phase 2 |
| `HYDRATE` / localhost server (no base64) | Planned — Phases 4–5 |
| Save to gallery (WebView export + stream POST) | Planned — Phases 8–9 |
| Post to S3 (`s3Url` only to RN) | Planned — Phase 10 |
| Text / stickers / audio | UI only — not MVP |

## Contributing

1. Branch from your team’s main integration branch.
2. Keep changes focused; coordinate protocol changes with **`mbt/`**.
3. Run **`bun run tsc`** and **`bun run lint`** before opening a PR.
4. Update **`plan_docs/`** when behavior or messages change in a non-obvious way.

## License

**Mobeet Technologies Private Limited — Proprietary.** All rights reserved.

This software is proprietary and confidential. See [LICENSE](./LICENSE) for full terms.

Licensing inquiries: **mobeetdotcom@gmail.com**

## Contributors

- **Author:** Atanu Debbarma
- **Contributors:** Abhijit Sinha, Kuchuk Debbarma

---

_Package folder name `frontend_threejs_filter_processor_preview` is historical; this repo is the production create-post editor bundle._
