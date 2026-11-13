# Prohance forms API (Adobe App Builder)

Three web actions that store the site's form submissions as AEM Content
Fragments, ported from the Next.js app (`src/services/forms/*`):

| Action | Form (block) | Fragment model | Folder |
| --- | --- | --- | --- |
| `contact` | Contact Us (`contact-hero`) | `contact-enquiry` | `form-data/contact` |
| `trial-request` | Request free sample (`request-sample`) | `trial-request` | `form-data/trial` |
| `newsletter` | Newsletter (`newsletter`) | `newsletter-subscription` | `form-data/newsletter` |

Each action: CORS for `ALLOWED_ORIGINS` only, POST only, honeypot (`website`),
optional Cloudflare Turnstile, per-IP rate limit (App Builder state store),
validation (same rules as Next.js; string values from the forms are
normalised), then `POST /adobe/sites/cf/fragments` on AEM author with the
service-credentials token. Field values are never logged.

Responses: `200 {ok, id}` stored · `400 {fields}` invalid (field names only) ·
`403` origin or Turnstile · `405` method · `429` rate limited · `502` AEM error.

## Prerequisites
- App Builder entitlement and an Adobe Developer Console project with a
  workspace (Stage, then Production) that has **I/O Runtime** added.
- AEM service credentials (AEM Developer Console → Integrations → Technical
  Accounts). The technical account needs **DAM write** on
  `/content/dam/prohance-website/site-a/form-data` (client Adobe admin).
- `npm install -g @adobe/aio-cli` (Node 22+).

## Deploy
```bash
cd forms-api
npm install
npm test                       # 13 unit tests, no network
aio login                      # Adobe ID in the client IMS org
aio app use                    # pick the Console project + workspace; writes AIO_* to .env
# add the values from .env.example to .env (keep the AIO_* lines aio wrote)
aio app deploy                 # prints the action URLs
```

Action URLs look like
`https://<namespace>.adobeioruntime.net/api/v1/web/prohance-forms/<action>`.

## Connect the site
1. In the EDS repo root `.env`, set
   `FORMS_BASE_URL=https://<namespace>.adobeioruntime.net/api/v1/web/prohance-forms`.
2. Re-upload the form pages; `upload.sh` fills their empty `Action` rows:
   `./drafts/da/upload.sh --publish contact-us.html modals/request-sample.html`
3. Submit each form on aem.page and check the fragment appears in AEM
   (Assets → `prohance-website/site-a/form-data/...`).

`ALLOWED_ORIGINS` must list every host that serves the forms: the aem.page and
aem.live hosts now, and the production domain at go-live.

## Turnstile (optional)
Set `TURNSTILE_SECRET` to require a Cloudflare Turnstile token
(`cf-turnstile-response`). The site's forms do not render the widget yet, so
leave it empty until they do.
