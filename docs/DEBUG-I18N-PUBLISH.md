# Debug: translations spreadsheet not published (404)

## If you see this in AEM publish logs (403 primary site)

```
x-error = [admin] Content operations restricted to the primary site: adobe-rnd/aem-boilerplate-xwalk
POST https://admin.hlx.page/preview/akaspanion/aem-eds-poc/main/...
```

**Meaning:** AEM is configured to publish content for `akaspanion/aem-eds-poc`, but **admin.hlx.page** only allows writes to the **boilerplate** repo `adobe-rnd/aem-boilerplate-xwalk` (the template you started from). The push is rejected → `/i18n/translations.json` never appears → i18n shows raw keys like `nav.language`.

This is **not** fixed by `paths.json`, Quick Publish alone, or GitHub Actions. You must align **AEM Cloud config** with a **registered Helix site** for your real GitHub repo.

### Fix (do in this order)

#### 1. Confirm your real GitHub coordinates

| Field | Yours (example) |
|-------|------------------|
| GitHub org | `AKAspanion` (logs use lowercase `akaspanion` — must match admin) |
| GitHub repo | `aem-eds-poc` |
| Preview URL | `https://main--aem-eds-poc--akaspanion.aem.page/` |

#### 2. Register your site on admin.hlx.page (Config Service)

1. Log in: `https://admin.hlx.page/login`
2. Copy `auth_token` cookie from browser DevTools.
3. List sites: `GET https://admin.hlx.page/config/akaspanion/sites.json` (try `AKAspanion` if 404).

If **`aem-eds-poc` is missing** or only `aem-boilerplate-xwalk` exists, create/update site config for **your** repo (see [repoless authoring](https://www.aem.live/developer/repoless-authoring)):

```bash
curl -X PUT "https://admin.hlx.page/config/akaspanion/sites/aem-eds-poc.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  --data '{
    "code": {
      "owner": "akaspanion",
      "repo": "aem-eds-poc",
      "source": {
        "type": "github",
        "url": "https://github.com/AKAspanion/aem-eds-poc"
      }
    },
    "content": {
      "source": {
        "url": "https://author-p62213-e804183.adobeaemcloud.com/bin/franklin.delivery/AKAspanion/aem-eds-poc/main",
        "type": "markup",
        "suffix": ".html"
      }
    }
  }'
```

Add `public.json` path mappings and `access.json` with your email + technical account (from AEM Edge Delivery config).

**Goal:** `aem-eds-poc` is the **primary** site for your program, not `aem-boilerplate-xwalk`.

#### 3. Update AEM Edge Delivery Services Configuration

1. AEM Author → **Tools** → **Cloud Services** → **Edge Delivery Services Configuration**.
2. Open the config used by `/content/p62213-s29435-aem-eds-poc`.
3. Set **Organization** = `akaspanion` / `AKAspanion` (match admin).
4. Set **Site name** = `aem-eds-poc` (must match admin site id).
5. **Repository** = `aem-eds-poc` (not `aem-boilerplate-xwalk`).
6. Save.

Re-assign this cloud config on the site root **Properties → Cloud Services** if needed.

#### 4. Republish and verify

1. Quick Publish `/content/p62213-s29435-aem-eds-poc/translations` again.
2. Publish logs should show **no** `restricted to the primary site: adobe-rnd/aem-boilerplate-xwalk`.
3. `curl -I "https://main--aem-eds-poc--akaspanion.aem.page/i18n/translations.json"` → **200**.

#### 5. If still blocked

- Your AEM program may still be tied to the Adobe demo boilerplate. Ask your AEM admin or Adobe support to **change the primary Helix site** for the cloud program to `akaspanion/aem-eds-poc`.
- Do **not** keep publishing to `adobe-rnd/aem-boilerplate-xwalk` unless your code and content intentionally live there.

---

GitHub Actions in this repo **does not publish** content to Edge Delivery. It only runs `npm run lint` on push. A failing workflow does **not** block AEM Quick Publish, but you should fix CI separately.

Publishing `/i18n/translations.json` is an **AEM Author → Edge Delivery** path, controlled by `paths.json` (or Config Service) + **Quick Publish** on the spreadsheet page.

---

## How publishing is supposed to work

```text
Git: paths.json  ──►  AEM Cloud (code sync / config)  ──►  knows mapping
AEM: /content/p62213-s29435-aem-eds-poc/translations  ──►  Quick Publish  ──►  EDS
Public URL: /i18n/translations.json
```

Your site HTML (200 on `/`) and your dictionary JSON (404) use **different pipelines**. Pages can work while the spreadsheet never reached EDS.

---

## Step 1 — Confirm the public URL (30 seconds)

In a browser or terminal:

```bash
curl -I "https://main--aem-eds-poc--AKAspanion.aem.page/i18n/translations.json"
```

| Result | Meaning |
|--------|---------|
| **404** | Spreadsheet not on EDS and/or path mapping not active |
| **200** | JSON exists — if i18n still fails, problem is keys/locale/JS |
| **401/403** | Auth on preview; try while logged in or check publish target |

Also try the AEM path (before mapping):

```bash
curl -I "https://main--aem-eds-poc--AKAspanion.aem.page/content/p62213-s29435-aem-eds-poc/translations.json"
```

If this returns **200** but `/i18n/translations.json` is **404**, path mapping from `paths.json` is not applied.

---

## Step 2 — Is `paths.json` on `main` in GitHub?

1. Open your repo on GitHub → branch **main**.
2. Open `paths.json` at the repo root.
3. It must contain:

```json
"/content/p62213-s29435-aem-eds-poc/translations:/i18n/translations"
```

Uncommitted local edits do nothing until **pushed to main** (or whatever branch AEM Code Sync tracks).

---

## Step 3 — AEM Code Sync (Git → AEM)

`paths.json` is read by AEM when the **AEM Code Sync** GitHub App has synced the repo.

1. GitHub → **Settings** → **Integrations** → **GitHub Apps** → **AEM Code Sync** → configured for this repo?
2. Recent commits on `main` — sync succeeded?
3. AEM → **Tools** → **Cloud Services** → **Edge Delivery Services Configuration** → your site → confirm org/repo/branch match GitHub.

Without sync, AEM may still publish pages from `/content/p62213-s29435-aem-eds-poc/` but not know the `/i18n/translations` mapping.

---

## Step 4 — Config Service vs repo `paths.json`

Check:

```bash
curl -I "https://main--aem-eds-poc--AKAspanion.aem.page/config.json"
```

| Result | What to do |
|--------|------------|
| **404** | Common on some setups; rely on repo `paths.json` + Code Sync (steps 2–3). |
| **200** | Open JSON and inspect `paths.mappings`. If missing or wrong, update via [Config Service](https://www.aem.live/docs/config-service-setup) (repo `paths.json` may be **ignored**). |

If you enabled **repoless / Config Service**, you must POST path mappings to admin API — editing only `paths.json` locally is not enough.

---

## Step 5 — AEM Author: spreadsheet exists and is published

1. **Sites** → `/content/p62213-s29435-aem-eds-poc/translations` exists (template **Spreadsheet**).
2. Columns: `key`, `en`, `fr`, … (row data present).
3. Select the spreadsheet → **Quick Publish** (not only Publish on the homepage).
4. In publish dialog, confirm success / no errors.

Republish after any change to `paths.json` on GitHub (wait a few minutes for sync), then **Quick Publish** the spreadsheet again.

---

## Step 6 — Spreadsheet under `includes`

`paths.json` should include the site root:

```json
"includes": ["/content/p62213-s29435-aem-eds-poc/"]
```

The translations page must live under that tree (`/content/p62213-s29435-aem-eds-poc/translations`). It should not be excluded by `excludes`.

---

## Step 7 — AEM publish / replication logs

On AEM Author:

1. **Tools** → **Deployment** → **Distribution** (or replication queue).
2. Look for failed packages related to your site or franklin delivery.
3. **Tools** → **Operations** → **Diagnostics** / `error.log` around Quick Publish time — search `franklin`, `helix`, `translation`, `spreadsheet`.

---

## Step 8 — Universal Editor vs live preview

| Surface | What to check |
|---------|----------------|
| UE editing | Keys may show until JSON is 200; republish spreadsheet + hard refresh |
| `*.aem.page` | Same as production preview for JSON URL |
| Custom domain | Same `paths` + publish; domain unrelated to spreadsheet path |

After JSON returns 200, test: `?locale=fr` on preview URL.

---

## GitHub Actions (your CI)

Workflow: `.github/workflows/main.yaml` — runs **lint only** on `push`.

It does **not**:

- Deploy to AEM
- Publish spreadsheets
- Update `paths.json` on Edge Delivery

Fix CI for code quality (note: workflow says Node 20 but uses `node-version: 24`):

```yaml
node-version: 20
```

A red GitHub Action does not explain `/i18n/translations.json` 404 unless you added a custom deploy workflow (this boilerplate has none).

---

## Checklist (copy/paste)

- [ ] `paths.json` on GitHub `main` with translations mapping
- [ ] AEM Code Sync app installed and synced
- [ ] `/content/p62213-s29435-aem-eds-poc/translations` exists in Sites
- [ ] Quick Publish on **translations** (not only home page)
- [ ] `curl -I .../i18n/translations.json` → **200**
- [ ] JSON `data` rows include `home.hero.text`, `nav.language`
- [ ] Page fields use keys; **Title** block updated if headline unchanged
- [ ] If Config Service enabled: `config.json` `paths.mappings` includes translations mapping

---

## Still 404?

Gather for support / Adobe forums:

1. Screenshot of `/content/p62213-s29435-aem-eds-poc/translations` in Sites + Quick Publish result
2. Link to `paths.json` on GitHub `main`
3. Output of `curl -I` for `/i18n/translations.json` and `/config.json`
4. Edge Delivery cloud config screenshot (org, site name, repoless yes/no)
5. Whether pages publish successfully from the same site root
