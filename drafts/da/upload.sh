#!/usr/bin/env bash
# Uploads the POC pages (index, nav, footer) to Document Authoring and previews them.
#
# Usage:
#   1. Sign in at https://da.live/#/akaspanion/aem-eds-poc
#   2. In that tab's devtools console run:  copy(window.adobeIMS.getAccessToken().token)
#   3. DA_TOKEN='<paste>' ./drafts/da/upload.sh
#
# The token stays in your shell; nothing here stores it.
set -euo pipefail

ORG=akaspanion
SITE=aem-eds-poc
DIR="$(cd "$(dirname "$0")" && pwd)"

: "${DA_TOKEN:?Set DA_TOKEN to your da.live IMS access token}"

for page in index nav footer; do
  printf 'Uploading %s ... ' "$page"
  curl -sS -f -X PUT \
    -H "Authorization: Bearer ${DA_TOKEN}" \
    -F "data=@${DIR}/${page}.html;type=text/html" \
    "https://admin.da.live/source/${ORG}/${SITE}/${page}.html" -o /dev/null
  echo ok
done

for path in index nav footer; do
  printf 'Previewing /%s ... ' "$path"
  if curl -sS -f -X POST \
    -H "Authorization: Bearer ${DA_TOKEN}" \
    "https://admin.hlx.page/preview/${ORG}/${SITE}/main/${path}" -o /dev/null; then
    echo ok
  else
    echo "failed (open the page in da.live and click Preview instead)"
  fi
done

echo "Preview: https://main--${SITE}--${ORG}.aem.page/"
