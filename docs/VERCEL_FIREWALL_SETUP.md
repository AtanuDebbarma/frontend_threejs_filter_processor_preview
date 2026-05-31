# Vercel firewall (OTA editor host)

Static site: `docs/` from `bun run pages:publish`. WAF rules are set in the **Vercel dashboard** (not `vercel.json`).

---

## 1. Generate the OTA secret (once)

```bash
openssl rand -hex 32
```

Copy the full line (64 hex characters).

---

## 2. Where to put the same secret

| Place | Variable / field |
| ----- | ---------------- |
| **`mbt/.env`** | `EXPO_PUBLIC_EDITOR_OTA_KEY=<paste-here>` |
| **EAS** (store builds) | Secret `EXPO_PUBLIC_EDITOR_OTA_KEY` (same value) |
| **Vercel WAF** | Header `X-Mobeet-Editor-Client` **equals** that value (inside deny/bypass rules below) |

Also set in **`mbt/.env`**:

```env
EXPO_PUBLIC_EDITOR_MANIFEST_URL=https://frontend-threejs-filter-processor-p.vercel.app/manifest.json
EXPO_PUBLIC_FONT_MANIFEST_URL=https://frontend-threejs-filter-processor-p.vercel.app/OTA_Fonts/manifest.json
```

Restart Metro after changing `.env`. Do **not** commit `.env`.

**Fonts:** same `EXPO_PUBLIC_EDITOR_OTA_KEY` / `X-Mobeet-Editor-Client` header on **manifest fetch and each `.ttf` download** (`fontUpdater.ts`).

Editor **version** bumps use `package.json` only — do **not** rotate this secret per release unless leaked.

---

## 3. Custom WAF rules (current setup)

**Bot Protection:** off (OTA `fetch` cannot pass JS challenge). **Publish** after every change.

### OTA deny — `OTA Deny — Mobeet app` → **Deny**

Block editor and font OTA paths unless the app sends the secret header.

**Minimum paths:** `/manifest.json`, `/index.html`, `/OTA_Fonts/manifest.json`, and `/OTA_Fonts/*.ttf` (or use **Path starts with** `/OTA_Fonts/`).

Example (two blocks joined by **OR**):

| Block | If | And |
| ----- | -- | --- |
| A | Request Path **Equals** `/manifest.json` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |
| B | Request Path **Equals** `/index.html` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |
| C | Request Path **Starts with** `/OTA_Fonts/` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |

Also **AND** (same paths): header **Does not contain** secret (covers missing/wrong partial header).

**Then:** **Deny**

```text
(protected path AND header bad/missing) → Deny
```

If you use a **catch-all** deny on `/*`, font `.ttf` downloads need the same header as the editor manifest (the app sends it on every OTA request after this fix).

Without header → **403** (browser address bar and `curl`). With correct header → **200** + JSON/HTML.

### Other rules (if still configured)

- **Probe paths** → Deny (`.env`, `.git`, `wp-admin`, etc.)
- **Rate limit** on `/manifest.json` and `/index.html` (optional)

### Optional later: OTA bypass (only if Bot Protection **Challenge** is on)

`(path = /manifest.json OR /index.html) AND header equals secret` → **Bypass** (must be **first** in the list). Not needed while Bot Protection is off.

---

## 4. Quick verify

```bash
# 403 expected
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://frontend-threejs-filter-processor-p.vercel.app/manifest.json

# 200 + JSON expected (use secret from mbt/.env)
curl -sS -H "X-Mobeet-Editor-Client: YOUR_SECRET" \
  https://frontend-threejs-filter-processor-p.vercel.app/manifest.json

# Font manifest + one .ttf (403 without header)
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://frontend-threejs-filter-processor-p.vercel.app/OTA_Fonts/manifest.json
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "X-Mobeet-Editor-Client: YOUR_SECRET" \
  https://frontend-threejs-filter-processor-p.vercel.app/OTA_Fonts/Poppins-Regular.ttf
```
