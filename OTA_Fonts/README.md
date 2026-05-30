# Mobile app fonts OTA (source)

Place `.ttf` / `.otf` files here. Edit **`version.json`** when you ship new font bytes (not tied to editor `package.json`).

```json
{
  "version": "0.0.1",
  "minAppVersion": "0.0.0"
}
```

- **`version`** — semver font bundle id (e.g. `0.0.1`, `0.0.2`). Bump only when fonts or manifest contract changes.
- **`minAppVersion`** — minimum native app version allowed to use this bundle (same idea as editor `manifest.json`).

```bash
bun run fonts:ota
```

Writes `docs/OTA_Fonts/manifest.json` + copies font files for deploy.

Editor releases (`bun run pages:publish`) do **not** regenerate this manifest.

Mobile (`fontUpdater.ts`) skips download when **both** local `version` + `sha256` match remote (and files exist on disk), same as editor OTA.
