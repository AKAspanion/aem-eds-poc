# Localization (AEM spreadsheet + domain locale)

This project resolves **translation keys** in page content using strings from an AEM **spreadsheet** published as `/i18n/translations.json`. The active language is chosen from the **hostname** (or `?locale=` on preview).

## AEM setup

### 1. Create the translations spreadsheet

1. Sign in to AEM Author → **Sites**.
2. Navigate to `/content/aem-eds-poc/`.
3. **Create** → **Page**.
4. On the **Template** tab, choose **Spreadsheet** (or **Placeholders** if Spreadsheet is not listed).
5. **Title:** `translations` (URL segment should be `translations`).
6. **Create** and **Open**.

Final path: `/content/aem-eds-poc/i18n/translations`

If the `i18n` folder does not exist, create an **`i18n` section page** first, then create `translations` under it.

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
"/content/aem-eds-poc/i18n/translations:/i18n/translations"
```

Commit and push to `main`, then wait for the GitHub → AEM sync if applicable.

### 5. Publish the spreadsheet

1. **Sites** → select `/content/aem-eds-poc/i18n/translations`.
2. **Quick Publish** → **Publish**.

### 6. Verify JSON

Open:

`https://main--aem-eds-poc--<your-org>.aem.page/i18n/translations.json`

You should see `columns` including `key`, `en`, `fr`, … and a `data` array.

## Authoring pages (Universal Editor)

Enter **keys only** in translatable fields, not final marketing copy.

**Hero example**

| Field | Value |
|-------|--------|
| Text | `home.hero.text` |
| Alt | `home.hero.imageAlt` |

**Button / title / cards** — same pattern: `page.block.field`.

After publish, the site replaces keys with values from the spreadsheet for the active locale.

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

| Issue | Check |
|-------|--------|
| Keys visible on site | Spreadsheet published? `/i18n/translations.json` returns 200? |
| Wrong language | `config/locales.json` domain map; try `?locale=fr` |
| Console warning `[i18n] Could not load` | Path mapping + Quick Publish spreadsheet |
| FR works, DE not | Column `de` exists and row has values |
