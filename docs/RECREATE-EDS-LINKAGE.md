# Option C — Recreate EDS linkage (step-by-step)

Fix `AEM_NOT_PRIMARY_CONTENT` by binding your AEM Cloud **program** to **`AKAspanion/aem-eds-poc`**, not `adobe-rnd/aem-boilerplate-xwalk`.

You **keep** your existing GitHub repo (blocks, i18n, `paths.json`). You **rebind** Cloud Manager + AEM site creation + Config Service.

**Your constants** (fill in if different):

| Item | Value |
|------|--------|
| GitHub org | `AKAspanion` |
| GitHub repo | `aem-eds-poc` |
| GitHub URL | `https://github.com/AKAspanion/aem-eds-poc` |
| AEM author | `https://author-p62213-e804183.adobeaemcloud.com` |
| Franklin delivery | `https://author-p62213-e804183.adobeaemcloud.com/bin/franklin.delivery/AKAspanion/aem-eds-poc/main` |
| Content root | `/content/p62213-s29435-aem-eds-poc` |
| EDS site id | `aem-eds-poc` |
| Preview URL | `https://main--aem-eds-poc--akaspanion.aem.page` |
| Cloud program | `p62213` (from author URL) |

---

## Phase 0 — Before you start (30 min)

### 0.1 Backup

- [ ] Export AEM content package: `/content/p62213-s29435-aem-eds-poc` (include `/translations` spreadsheet page).
- [ ] Confirm GitHub `main` is pushed (all i18n + model work).
- [ ] Note current Edge Delivery cloud config name in AEM (**Tools → Cloud Services**).

### 0.2 Success criteria (write these down)

After completion, **all** must pass:

```bash
# 1) No primary-site error
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://admin.hlx.page/preview/akaspanion/aem-eds-poc/main/i18n/translations.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $HLX_TOKEN" \
  --data-binary @translations-payload.json
# Expected: 200 or 204 (NOT 403)

# 2) JSON on preview
curl -I "https://main--aem-eds-poc--akaspanion.aem.page/i18n/translations.json"
# Expected: 200

# 3) AEM Distribution → publish queue NOT blocked
```

### 0.3 Roles you need

- [ ] Cloud Manager: Business Owner or permission to manage **Edge Delivery** tab
- [ ] AEM: admin on author
- [ ] GitHub: admin on `AKAspanion/aem-eds-poc`
- [ ] `admin.hlx.page` login (Adobe ID)

---

## Phase 1 — GitHub & code (keep repo, verify wiring)

### 1.1 AEM Code Sync

1. Open `https://github.com/apps/aem-code-sync`
2. **Configure** → org **AKAspanion**
3. **Only select repositories** → check **`aem-eds-poc`** → Save

### 1.2 Confirm repo files on `main`

- [ ] `fstab.yaml` → franklin delivery URL (see constants table)
- [ ] `paths.json` → mappings for site + translations
- [ ] `config/locales.json`, `scripts/i18n.js`, etc.

```bash
cd aem-eds-poc
npm run build:json   # if you changed models/
git status
git push origin main
```

### 1.3 Wait for Code Sync

After push, wait 2–5 minutes. AEM author should see updated `component-*.json` for UE.

---

## Phase 2 — Cloud Manager: Edge Delivery site (primary binding)

This step registers the **program-level** Edge Delivery site against **your** repo.

1. Go to [experience.adobe.com](https://experience.adobe.com) → **Cloud Manager**
2. Open program **p62213** (your sandbox/program)
3. **Overview** → **Edge Delivery** tab

### 2.1 If no verified site OR site points at boilerplate

1. Click **Create site now** (or add site)
2. **Project name / site name:** `aem-eds-poc` (match preview hostname)
3. **Authoring:** select **AEM Authoring** (not Doc Authoring)
4. **Template:** Universal Editor / xwalk template if offered
5. **Author environment:** select your author tier (`author-p62213-e804183...`)
6. **Repository:** must be **`AKAspanion/aem-eds-poc`** — **not** `aem-boilerplate-xwalk`
   - If CM only creates a *new* empty repo, stop and use **Phase 2B** below or ask Adobe to link existing repo
7. Click **Create site now**
8. Wait until status **Verified** (green dot)

Docs: [Create Edge Delivery site](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/using-cloud-manager/edge-delivery-sites/create-edge-delivery-site)

### 2.2 If a site already exists in CM

1. Open site row → confirm **Repository** = `AKAspanion/aem-eds-poc`
2. If it shows boilerplate → edit/reconnect repo, or delete POC site and recreate with correct repo
3. Use **Publish site** from CM menu once verified

### 2.2B Alternative — no Cloud Manager EDS license

Skip to Phase 3 + 4, then open Adobe Support ticket to set primary site to `akaspanion/aem-eds-poc` (include `AEM_NOT_PRIMARY_CONTENT` logs).

---

## Phase 3 — Config Service (`admin.hlx.page`)

### 3.1 Login token

1. `https://admin.hlx.page/login` (Adobe ID)
2. DevTools → Application → Cookies → `auth_token`
3. Terminal:

```bash
export HLX_TOKEN='PASTE_COOKIE_VALUE_HERE'
```

### 3.2 PUT site (code + content source)

```bash
curl -X PUT "https://admin.hlx.page/config/akaspanion/sites/aem-eds-poc.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $HLX_TOKEN" \
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

### 3.3 POST paths (public.json)

```bash
curl -X POST "https://admin.hlx.page/config/akaspanion/sites/aem-eds-poc/public.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $HLX_TOKEN" \
  --data '{
  "paths": {
    "mappings": [
      "/content/p62213-s29435-aem-eds-poc/:/",
      "/content/p62213-s29435-aem-eds-poc/translations:/i18n/translations"
    ],
    "includes": [
      "/content/p62213-s29435-aem-eds-poc/"
    ]
  }
}'
```

### 3.4 POST access (your email + technical account)

Get technical account: AEM → **Cloud Services → Edge Delivery Services Configuration → Authentication**

```bash
curl -X POST "https://admin.hlx.page/config/akaspanion/sites/aem-eds-poc/access.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $HLX_TOKEN" \
  --data '{
  "admin": {
    "role": {
      "admin": ["ankitp@geekyants.com"],
      "config_admin": ["YOUR_TECH_ACCOUNT_ID@techacct.adobe.com"]
    },
    "requireAuth": "auto"
  }
}'
```

### 3.5 Verify config

```bash
curl -s "https://main--aem-eds-poc--akaspanion.aem.page/config.json" | head -30
```

---

## Phase 4 — AEM Author: recreate site (critical for primary site)

The **GitHub URL** in the Create Site wizard binds the program primary site. Wrong URL → `AEM_NOT_PRIMARY_CONTENT`.

### 4.1 Import site template (once per author)

1. Download: https://github.com/adobe-rnd/aem-boilerplate-xwalk/releases (latest `.zip`)
2. AEM → **Sites** → **Create** → **Site from template** → **Import**
3. Upload zip

### 4.2 Remove or archive old site (optional but recommended)

If the old site was created with wrong GitHub URL:

1. **Sites** → select old `aem-eds-poc` root (if exists)
2. **Unpublish** if needed
3. **Delete** site, **or** move to `/content/archive/aem-eds-poc-old` (if you prefer safe archive)

> If you delete content, restore from Phase 0 package before going live.

### 4.3 Create site with correct GitHub URL

1. **Sites** → **Create** → **Site from template**
2. Select imported **Edge Delivery / xwalk** template → **Next**
3. Fill **exactly**:

| Field | Value |
|-------|--------|
| Site title | AEM EDS POC (any label) |
| Site name | `aem-eds-poc` |
| GitHub URL | `https://github.com/AKAspanion/aem-eds-poc` |

4. **Create** → OK

### 4.4 Edge Delivery cloud config on site

1. **Tools** → **Cloud Services** → **Edge Delivery Services Configuration**
2. Open config used by this program (or create new):
   - **Organization:** `akaspanion`
   - **Site name:** `aem-eds-poc`
   - **Repository:** `aem-eds-poc`
   - **Project type:** `aem.live` with repoless / Config Service (if shown)
3. **Sites** → `/content/p62213-s29435-aem-eds-poc` → **Properties** → **Cloud Services** → assign this config → Save

### 4.5 Recreate translations spreadsheet

1. Under `/content/p62213-s29435-aem-eds-poc/` → **Create** → **Spreadsheet** → name `translations`
2. Columns: `key`, `en`, `fr`, `de`
3. Import `docs/i18n-translations-sample.csv` or paste rows
4. Do **not** publish yet (Phase 5)

### 4.6 Recreate pages (if you deleted content)

- Home `index`, nav/footer fragments, hero with keys (`home.hero.text`), etc.
- Or install Phase 0 content package

---

## Phase 5 — Unblock publish & verify

### 5.1 Clear blocked distribution queue

1. **Tools** → **Deployment** → **Distribution**
2. Open **publish** queue (was BLOCKED)
3. Remove failed packages for old paths
4. Confirm state is no longer BLOCKED

### 5.2 Test admin POST (before AEM publish)

```bash
curl -v -X POST "https://admin.hlx.page/preview/akaspanion/aem-eds-poc/main/i18n/translations.json" \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $HLX_TOKEN" \
  --data-binary @translations-payload.json
```

- **403 + boilerplate** → Phase 2 or 4 not complete; stop and fix CM/GitHub URL
- **200/204** → continue

### 5.3 AEM Quick Publish

1. **Sites** → `/content/p62213-s29435-aem-eds-poc/translations` → **Quick Publish**
2. **Sites** → home page → **Quick Publish**
3. Check **Distribution** logs — must **not** show `aem-boilerplate-xwalk`

### 5.4 Public URLs

```bash
curl -I "https://main--aem-eds-poc--akaspanion.aem.page/i18n/translations.json"
curl -s "https://main--aem-eds-poc--akaspanion.aem.page/i18n/translations.json" | head -20
```

### 5.5 Browser

- `https://main--aem-eds-poc--akaspanion.aem.page/?locale=fr`
- Header: **Language** (not `nav.language`)
- Hero/title: translated if keys set

---

## Phase 6 — Local dev (optional)

```bash
npm install -g @adobe/aem-cli
cd aem-eds-poc
aem up
# http://localhost:3000/?locale=fr
```

Local `aem up` reads repo + may proxy AEM; translations still need published JSON on preview for full parity.

---

## Phase 7 — Custom domains (later)

After preview works, map `www.example.fr` etc. in Cloud Manager / AEM and `config/locales.json`.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| POST still 403 boilerplate | GitHub URL wrong at **Create Site**; CM site points at boilerplate repo |
| `sites.json` OK but 403 | Program primary not updated — Adobe Support with program id |
| publish BLOCKED | Clear Distribution queue (Phase 5.1) |
| config.json OK, JSON 404 | Content never POSTed — fix 403 first |
| Models work, i18n not | Expected until content pipeline fixed (code vs content) |

---

## Checklist summary

- [ ] Phase 0 backup
- [ ] Phase 1 Code Sync + push `main`
- [ ] Phase 2 Cloud Manager EDS site → repo `AKAspanion/aem-eds-poc` → Verified
- [ ] Phase 3 admin curl PUT + public + access
- [ ] Phase 4 AEM site recreated with **your** GitHub URL
- [ ] Phase 5 clear queue → POST test 200 → Quick Publish → translations.json 200
