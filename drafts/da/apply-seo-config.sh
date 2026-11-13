#!/usr/bin/env bash
# Applies the SEO config to the site via the Configuration Service:
#   - query.yaml  (site-wide index for the sitemap + the blog index)
#   - sitemap.yaml
#   - robots.txt  (Sitemap line only when PROD_HOST is set, e.g. www.example.com)
# then re-indexes every published page and rebuilds the sitemap.
#
# Usage: ./drafts/da/apply-seo-config.sh        (reads HLX_TOKEN and optional PROD_HOST from .env)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
. "${DIR}/_env.sh"
# target site: override with EDS_ORG / EDS_SITE in .env (e.g. the Cloud Manager site)
ORG="${EDS_ORG:-akaspanion}"
SITE="${EDS_SITE:-aem-eds-poc}"

: "${HLX_TOKEN:?Set HLX_TOKEN in .env or the shell (admin.hlx.page auth_token cookie)}"
CFG="https://admin.hlx.page/config/${ORG}/sites/${SITE}"
AUTH=(-H "x-auth-token: ${HLX_TOKEN}")

post() { # path content-type file
  curl -sS -f -X POST "${AUTH[@]}" -H "Content-Type: $2" --data-binary "@$3" "${CFG}/$1" -o /dev/null
  echo "saved $1"
}

post content/query.yaml text/yaml "${DIR}/query-index.yaml"
post content/sitemap.yaml text/yaml "${DIR}/sitemap.yaml"

ROBOTS="$(mktemp)"
{
  echo "User-agent: *"
  echo "Allow: /"
  echo "Disallow: /drafts/"
  echo "Disallow: /modals/"
  if [ -n "${PROD_HOST:-}" ]; then
    host="${PROD_HOST#https://}"; host="${host#http://}"; host="${host%/}"
    echo; echo "Sitemap: https://${host}/sitemap.xml"
  fi
} > "$ROBOTS"
post robots.txt text/plain "$ROBOTS"
rm -f "$ROBOTS"

# Re-index every page so both indexes fill without republishing content.
paths=(/ /about-us /contact-us /products/prohance /products/prohance-dm /products/prohance-hp
  /nutriverse/blogs /nutriverse/recipes /nutriverse/videos
  /nutriverse/blogs/boost-your-health-with-fibre-rich-foods /nutriverse/blogs/create-your-personalize
  /nutriverse/blogs/how-many-calories-should-i-eat-a-day /nutriverse/blogs/how-to-calculate-protein
  /nutriverse/blogs/the-food-pyramid-a-guide-to-nutritional-balance)
for p in "${paths[@]}"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "https://admin.hlx.page/index/${ORG}/${SITE}/main${p}")
  printf 'index %-60s %s\n' "$p" "$code"
done

code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "https://admin.hlx.page/sitemap/${ORG}/${SITE}/main/sitemap.xml")
echo "sitemap rebuild: $code"
echo "Check: https://main--${SITE}--${ORG}.aem.live/sitemap.xml"
