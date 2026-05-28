# Localization (AEM spreadsheet + repo fallback)

Authors enter **translation keys** in AEM page content (hero, nav fragment, title, etc.). At runtime, `scripts/i18n.js` resolves keys using:

| Source | URL | When |
|--------|-----|------|
| **Primary** | `/i18n/translations.json` | AEM spreadsheet Quick Publish (`/content/p62213-s29435-aem-eds-poc/translations`) |
| **Fallback** | `/config/translations.json` | Git deploy until AEM publish works |

AEM values **override** the repo fallback for the same key. The language switcher label (`nav.language`) uses the same dictionary.

Active language: **hostname** or `?locale=` on preview (`config/locales.json`).

## AEM translations spreadsheet (primary)

1. **Sites** → `/content/p62213-s29435-aem-eds-poc/` → **Create** → **Spreadsheet** → title `translations`
2. Columns: `key`, `en`, `fr`, `de`, … (see `docs/i18n-translations-sample.csv`)
3. **Quick Publish** the spreadsheet page
4. `paths.json` maps: `/content/p62213-s29435-aem-eds-poc/translations:/i18n/translations`

Verify:

```bash
curl -I "https://main--aem-eds-poc--<org>.aem.page/i18n/translations.json"
```

Expect **200** with `data` rows after publish.

## Repo fallback (`config/translations.json`)

Use while AEM publish is blocked. Edit when adding keys before the spreadsheet is live:

```json
{
  "locales": {
    "en": {
      "home.hero.text": "<h1>Welcome</h1>",
      "nav.language": "Language"
    },
    "fr": {
      "home.hero.text": "<h1>Bienvenue</h1>",
      "nav.language": "Langue"
    }
  }
}
```

- Keys must match what authors enter in Universal Editor (e.g. `home.hero.text`).
- Rich text values may include HTML; plain fields use plain strings.
- Add a locale block for each language in `config/locales.json` (`en`, `fr`, `de`, …).

Commit and push to `main`. Code deploy serves the file at:

`https://main--aem-eds-poc--<your-org>.aem.page/config/translations.json`

### Verify

```bash
curl -I "https://main--aem-eds-poc--<org>.aem.page/config/translations.json"
```

Expect **200**. If i18n still shows raw keys, hard-refresh or clear cache.

### Optional: migrate from CSV

Use `docs/i18n-translations-sample.csv` as a reference. Convert rows to `locales.<code>.<key>` entries in `config/translations.json`.

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

After deploy, the site replaces keys with values from the merged dictionary (AEM + fallback) for the active locale.

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

Use key `nav.language` in `config/translations.json` for the “Language” label.

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

## Troubleshooting

| Issue | Check |
|-------|--------|
| Keys visible (`nav.language`) | Fallback on `main` **or** AEM spreadsheet published; check both URLs |
| Wrong language | `config/locales.json` domain map; try `?locale=fr` |
| Console warning `[i18n] No translations` | Neither `/i18n/translations.json` nor `/config/translations.json` has rows for locale |
| FR works, DE not | Column `de` in spreadsheet or `locales.de` in fallback |

For legacy AEM spreadsheet publish issues, see **[DEBUG-I18N-PUBLISH.md](./DEBUG-I18N-PUBLISH.md)**.
