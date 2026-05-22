# Localization (repo dictionary + domain locale)

This project resolves **translation keys** in page content using **`config/translations.json`** in Git. The active language is chosen from the **hostname** (or `?locale=` on preview). No AEM spreadsheet publish is required.

## Translation dictionary (`config/translations.json`)

Edit this file when adding or changing copy. Structure:

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

After deploy, the site replaces keys with values from `config/translations.json` for the active locale.

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
| Keys visible (`nav.language`) | `config/translations.json` on `main`; curl URL above → **200** |
| Wrong language | `config/locales.json` domain map; try `?locale=fr` |
| Console warning `[i18n] Could not load` | File path `translationsPath` in `locales.json` (default `/config/translations`) |
| FR works, DE not | `locales.de` block exists with values for each key |

For legacy AEM spreadsheet publish issues, see **[DEBUG-I18N-PUBLISH.md](./DEBUG-I18N-PUBLISH.md)**.
