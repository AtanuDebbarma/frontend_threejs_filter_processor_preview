# Vercel deploy + Firewall (manual dashboard steps)

WAF custom rules **cannot** be defined in `vercel.json` (only security headers). Configure firewall rules in the **Vercel dashboard**.

**Publish directory:** `docs` (from `bun run pages:publish`).

---

## OTA secret — generate, store, update

The secret is **not** your editor version (`0.0.1`, `0.0.2`). Version bumps use `package.json` only. The secret only proves that **your app** is allowed past Vercel Bot Protection when downloading `manifest.json` and `index.html`.

| Item | Value |
| ---- | ----- |
| **Header name** (fixed in code) | `X-Mobeet-Editor-Client` |
| **Env var in `mbt`** | `EXPO_PUBLIC_EDITOR_OTA_KEY` |
| **Vercel** | Same value in custom rule **OTA bypass** (header condition) |

### 1. Generate (once, on your machine)

Run in **Git Bash**, **WSL**, or **macOS terminal** (not in git, not in chat with teammates if avoidable):

```bash
openssl rand -hex 32
```

Example output shape (64 hex characters — **yours will be different**):

```text
9f3a1c8e2b...   # copy the full line
```

**Alternatives:**

- **PowerShell:** `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`
- **Password manager:** generate 32+ character random password (no spaces).

Copy the value to a password manager or secure note. You will paste the **same** string in two places below.

### 2. Where to store it (two places, same value)

| # | Where | What to do |
| - | ----- | ---------- |
| **A** | **`mbt/.env`** (create file if missing) | Add lines below. **Never commit** `.env` (gitignored). |
| **B** | **Vercel dashboard** → Firewall → custom rule **OTA bypass** | Header `X-Mobeet-Editor-Client` **Equals** → paste **same** secret. See [§3 Rule 1](#rule-1--ota-bypass--mobeet-app--bypass). |

**`mbt/.env` template** (`d:\mobeet\mbt\.env` on Windows):

```env
EXPO_PUBLIC_EDITOR_MANIFEST_URL=https://YOUR-PROJECT.vercel.app/manifest.json
EXPO_PUBLIC_EDITOR_OTA_KEY=paste-your-openssl-output-here-with-no-quotes-or-spaces
```

After saving `.env`:

1. **Restart Metro** in `mbt/`: stop `bun start`, run `bun start` again.
2. Reopen the dev client on the emulator if OTA already failed once.

The app sends the header in `mbt/app/features/createPost/serviceCalls/editorUpdater.ts` on every manifest and HTML fetch.

**Reference only (committed, no real secret):** `mbt/.env.example` shows variable names — put the real value only in `.env`.

### 3. When to update the secret

| Situation | New `openssl rand -hex 32`? |
| --------- | --------------------------- |
| New editor release `0.0.1` → `0.0.2` | **No** — bump `package.json` `version` only |
| First-time setup | **Yes** — once |
| Secret leaked / employee left | **Yes** — rotate |
| Move to backend S3 auth later | Remove or replace this flow |

**If you rotate:**

1. Generate new secret.
2. Update **`mbt/.env`** → `EXPO_PUBLIC_EDITOR_OTA_KEY=...`
3. Update **Vercel** bypass rule header value to match.
4. Restart Metro; rebuild dev client if needed so `EXPO_PUBLIC_*` is picked up.

### 4. Checklist — you generated the secret, what’s next?

Do in order:

- [ ] **1.** Paste secret into **`mbt/.env`** as `EXPO_PUBLIC_EDITOR_OTA_KEY` (see [§2](#2-where-to-store-it-two-places-same-value)).
- [ ] **2.** Publish editor to Vercel ([§1](#1-vercel-project-settings)) — or confirm project already deployed.
- [ ] **3.** Set `EXPO_PUBLIC_EDITOR_MANIFEST_URL` in `.env` to `https://<your-project>.vercel.app/manifest.json`.
- [ ] **4.** Configure Vercel Firewall: Bot Protection + 3 custom rules ([§2–3](#2-bot-management-not-counted-in-your-3-custom-rules)) — paste secret in **Rule 1 bypass**.
- [ ] **5.** Test with curl ([§5](#5-verify)).
- [ ] **6.** Test on device: create post + network → Metro `[EditorOTA] success`.
- [ ] **7.** Continue **Phase 4** in `mbt` (static server + `HYDRATE`) when ready.

---

## 1. Vercel project settings

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import repo `frontend_threejs_filter_processor_preview`.
2. **Framework Preset:** Vite (or Other).
3. **Root Directory:** `.`
4. **Build Command:** `bun run pages:publish`
5. **Output Directory:** `docs`
6. **Install Command:** `bun install`
7. Deploy. Note URL: `https://your-project.vercel.app`.

Set manifest URL in `mbt/.env` (with your real secret from [OTA secret](#ota-secret--generate-store-update)):

```env
EXPO_PUBLIC_EDITOR_MANIFEST_URL=https://your-project.vercel.app/manifest.json
EXPO_PUBLIC_EDITOR_OTA_KEY=<your-openssl-secret>
```

---

## 2. Bot Management (not counted in your 3 custom rules)

**Project → Firewall → Rules**

### Bot Protection

1. **Bot Protection** → start with **Log**, then **Challenge**.
2. **Publish**.

### AI Bots (optional)

- **AI Bots** → **Deny** → **Publish**.

### OWASP core

- Leave **off** for a 2-file static site unless you need it.

---

## 3. Custom WAF rules (max 3 on Hobby)

**Firewall → Configure → Add New → Rule**  
Order: **Bypass first** (top of list).

### Rule 1 — `OTA bypass — Mobeet app` → **Bypass**

**Conditions:**

| Parameter | Operator | Value |
| --------- | -------- | ----- |
| Request Path | Equals | `/manifest.json` |
| Request Path | Equals | `/index.html` |

Combine the two path rows with **OR**.

**AND**

| Parameter | Operator | Value |
| --------- | -------- | ----- |
| Header | Equals | Key: `X-Mobeet-Editor-Client` · Value: **exact** `EXPO_PUBLIC_EDITOR_OTA_KEY` from `mbt/.env` |

**Then:** **Bypass** → **Save** → move to **top** → **Publish**.

**Natural language (dashboard):**

```text
Bypass requests where (path equals /manifest.json OR path equals /index.html) AND header X-Mobeet-Editor-Client equals <paste-same-secret-as-mbt-env>
```

---

### Rule 2 — `Block common probe paths` → **Deny**

**Conditions (OR):**

| Parameter | Operator | Value |
| --------- | -------- | ----- |
| Request Path | Ends With | `.env` |
| Request Path | Ends With | `.git` |
| Request Path | Contains | `wp-admin` |
| Request Path | Contains | `wp-login` |
| Request Path | Ends With | `.bak` |
| Request Path | Ends With | `.sql` |

**Then:** **Deny** → **Publish**.

---

### Rule 3 — `Rate limit manifest and HTML` → **Rate limit** (optional)

**Conditions (OR):** path equals `/manifest.json` or `/index.html`.

**Then:** Rate limit e.g. **60 requests / 60 seconds** per **IP**, follow-up **Deny**.

---

## 4. Editor version (separate from secret)

Each time you publish a new web bundle:

1. Bump **`version`** in `frontend_threejs_filter_processor_preview/package.json` (e.g. `0.0.1` → `0.0.2`).
2. Run `bun run pages:publish`.
3. Commit and push `docs/`.
4. **Do not** change `EXPO_PUBLIC_EDITOR_OTA_KEY` unless rotating the secret.

---

## 5. Verify

Replace `<your-secret>` and URL with your values.

```bash
curl -sS -H "X-Mobeet-Editor-Client: <your-secret>" \
  https://your-project.vercel.app/manifest.json
```

Should return JSON. Without header, Bot Protection may block.

On device: create post with network → Metro log `[EditorOTA] success`.

If you see `[EditorOTA] warn` … `EXPO_PUBLIC_EDITOR_OTA_KEY not set`, the app is not sending the header — fix `.env` and restart Metro.

---

## 6. Repo files (in git)

| File | Role |
| ---- | ---- |
| `vercel.json` (repo root) | CSP, `X-Robots-Tag`, security headers |
| `static-pages/robots.txt` | Copied to `docs/robots.txt` on publish |
| `docs/index.html`, `docs/manifest.json` | OTA bundle |
| `docs/VERCEL_FIREWALL_SETUP.md` | This guide (not served to end users as app UI) |

Republish: `bun run pages:publish` → commit `docs/` → push.

---

## 7. Later (backend)

Replace Vercel with authenticated S3 + presigned URLs; remove or narrow bypass when `editorUpdater` uses backend auth.
