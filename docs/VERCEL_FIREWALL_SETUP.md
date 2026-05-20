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
```

Restart Metro after changing `.env`. Do **not** commit `.env`.

Editor **version** bumps use `package.json` only — do **not** rotate this secret per release unless leaked.

---

## 3. Custom WAF rules (current setup)

**Bot Protection:** off (OTA `fetch` cannot pass JS challenge). **Publish** after every change.

### OTA deny — `OTA Deny — Mobeet app` → **Deny**

Block `/manifest.json` and `/index.html` unless the app sends the secret header.

Two blocks joined by **OR**:

| Block | If | And |
| ----- | -- | --- |
| A | Request Path **Equals** `/manifest.json` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |
| B | Request Path **Equals** `/index.html` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |

Also **AND** (same paths): header **Does not contain** secret (covers missing/wrong partial header).

**Then:** **Deny**

```text
(path = /manifest.json AND header bad/missing) OR (path = /index.html AND header bad/missing) → Deny
```

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
```
