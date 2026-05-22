# Localization (AEM spreadsheet + domain locale)

This project resolves **translation keys** in page content using strings from an AEM **spreadsheet** published as `/i18n/translations.json`. The active language is chosen from the **hostname** (or `?locale=` on preview).

## AEM setup

### 1. Create the translations spreadsheet

1. Sign in to AEM Author → **Sites**.
2. Navigate to `/content/aem-eds-poc/`.
3. **Create** → **Page** (template **Spreadsheet**).
4. **Title:** `translations` (URL segment: `translations`).
5. **Create** and **Open**.

Final path: **`/content/aem-eds-poc/translations`**

### 2. Define columns

Add columns in this order (names must match exactly):

| Column | Description |
|--------|-------------|
| `key` | Translation key used in pages (e.g. `home.hero.text`) |
| `en` | English copy (can include HTML for rich text) |
| `fr` | French |
| `de` | German |

Add more locale columns as needed (`it`, `es`, …). Column name must match the locale code in `config/locales.json` domains.

### 3. Add rows (example)

| key | en | fr | de |
|-----|----|----|-----|
| `home.hero.text` | `<h1>Welcome</h1>` | `<h1>Bienvenue</h1>` | `<h1>Willkommen</h1>` |
| `home.hero.imageAlt` | Hero banner | Bannière | Hero-Banner |
| `nav.contact` | Contact | Contact | Kontakt |

### 4. Publish path mapping

`paths.json` in Git must include (already committed):

```json
"/content/aem-eds-poc/translations:/i18n/translations"
```

The site root is already in `includes` (`/content/aem-eds-poc/`), so the spreadsheet is published with your pages.

Commit and push to `main`, then wait for the GitHub → AEM sync if applicable.

### 5. Publish the spreadsheet

1. **Sites** → select `/content/aem-eds-poc/translations`.
2. **Quick Publish** → **Publish**.

### 6. Verify JSON

Open:

`https://main--aem-eds-poc--<your-org>.aem.page/i18n/translations.json`

You should see `columns` including `key`, `en`, `fr`, … and a `data` array.

## Authoring pages (Universal Editor)

Enter **keys only** in translatable fields, not final marketing copy.

**Hero block** (block properties in Universal Editor)

| Field | Value |
|-------|--------|
| Text | `home.hero.text` |
| Alt | `home.hero.imageAlt` |

**Title block** (separate component — often the main page headline)

| Field | Value |
|-------|--------|
| Title | `home.hero.text` (or your own key) |

If you still see *"Welcome to AEM authoring with Edge Delivery Services!"*, that text is usually in a **Title** component, not the Hero **Text** field. Edit the Title block on the page, or replace that component’s title with your key.

**Button / cards** — same pattern: `page.block.field`.

After publish, the site replaces keys with values from the spreadsheet for the active locale.

## Language switcher

A dropdown in the header (**nav tools**) lists locales from `config/locales.json` → `languages`.

| Environment | Behavior |
|-------------|----------|
| Production (`www.example.fr`, etc.) | Redirects to the `hostname` for that locale (same path) |
| Preview (`*.aem.page`) / `localhost` | Sets `?locale=fr` and `sessionStorage`, then reloads |

Add or edit entries:

```json
"languages": [
  { "code": "en", "label": "EN", "hostname": "www.example.com" },
  { "code": "fr", "label": "FR", "hostname": "www.example.fr" }
]
```

Optional spreadsheet key `nav.language` for the “Language” label.

## Preview locale on `*.aem.page`

Production domains are not available on author preview. Use:

`https://main--aem-eds-poc--<org>.aem.page/?locale=fr`

The choice is stored in `sessionStorage` until cleared.

## Domain → locale (`config/locales.json`)

Edit `config/locales.json` in Git when adding a country:

```json
"domains": {
  "www.example.fr": "fr",
  "www.example.de": "de"
}
```

Attach each custom domain to the **same** EDS site in AEM Cloud Services.

## Import translations via CSV

1. Open the spreadsheet in AEM.
2. **Upload** → **Replace Doc** or **Append To Doc**.
3. CSV headers must match columns: `key`, `en`, `fr`, `de`, …

## Troubleshooting

See **[DEBUG-I18N-PUBLISH.md](./DEBUG-I18N-PUBLISH.md)** for a full publish/paths/debug guide (GitHub Actions, Code Sync, Config Service, Quick Publish).

| Issue | Check |
|-------|--------|
| Keys visible (`nav.language`) | `/i18n/translations.json` must return **200** (not 404). Quick Publish spreadsheet; push `paths.json`; republish page. |
| Wrong language | `config/locales.json` domain map; try `?locale=fr` |
| Console warning `[i18n] Could not load` | Path mapping + Quick Publish spreadsheet |
| FR works, DE not | Column `de` exists and row has values |
