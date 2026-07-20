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
| **Vercel WAF Deny** | Header `X-Mobeet-Editor-Client` must **equal** that value (see OTA deny below) |

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

**Publish** after every Firewall change.

| Setting | Value | Why |
| ------- | ----- | --- |
| **Bot Protection** | **Off** | OTA `fetch` cannot pass a JS challenge |
| **AI Bots Protection** | **On** | Block AI crawlers; does not block the mobile OTA header path |
| **Rate limit** | Vercel **basic default** ruleset | Throttle abusive traffic |

Do not turn Bot Protection **Challenge** on unless you also add a custom Bypass for the secret header (custom Bypass skips managed rulesets; **System Bypass is IP/CIDR only** and cannot match this header).

**Note:** Path **Equals** `/*` is **not** a wildcard. Use **Starts with** `/`.

### OTA deny → **Deny** (main rule)

Lock the whole host behind the app secret. Covers editor + fonts (`/manifest.json`, `/index.html`, `/OTA_Fonts/…`, and everything else on this project).

Two blocks joined by **OR**, then **Deny**:

| Block | If | And |
| ----- | -- | --- |
| A | Request Path **Starts with** `/` | Header `X-Mobeet-Editor-Client` **Does not contain** secret |
| B | Request Path **Starts with** `/` | Header `X-Mobeet-Editor-Client` **Does not equal** secret |

**Then:** **Deny**

```text
(path starts with / AND header does not contain secret)
OR
(path starts with / AND header does not equal secret)
→ Deny
```

- Without header / wrong header → **403** (browser and `curl`)
- With exact `X-Mobeet-Editor-Client: <secret>` → **200** (mobile app)

Do **not** Deny when the header **Equals** the secret (that would block the app).

Because this rule already denies **all** paths without the secret, unauthenticated scanner probes (`/.env`, `/wp-admin`, …) are blocked here too.

### Probe paths → **Deny** (defense in depth)

Extra deny for common probe URLs **even when** the OTA header is present. No header condition.

| If | Operator | Value |
| -- | -------- | ----- |
| Request Path | **Matches regex** | see below |

**Regex (current):**

```regex
(/\.[Ee][Nn][Vv]|/\.git|/\.aws|/\.htaccess|/\.DS_Store|/wp-admin|/wp-login|/xmlrpc\.php|/phpinfo\.php|/server-status|/actuator|\.bak$|\.sql$)
```

**Then:** **Deny**

Do **not** match legitimate OTA paths (`/manifest.json`, `/index.html`, `/OTA_Fonts/`).

### Rate limit

Vercel **basic default** rate-limit ruleset (dashboard). Adjust only if Firewall logs show abuse.

### Crawler / index hygiene (not WAF)

| Layer | Where | Effect |
| ----- | ----- | ------ |
| `robots.txt` | `static-pages/robots.txt` → copied to `docs/` on publish | `User-agent: *` / `Disallow: /` |
| Response headers | `vercel.json` | `X-Robots-Tag: noindex, nofollow, …` + no-store cache |

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

# Probe path — 403 expected even with a header
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "X-Mobeet-Editor-Client: YOUR_SECRET" \
  https://frontend-threejs-filter-processor-p.vercel.app/.env
```
