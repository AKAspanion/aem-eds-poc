#!/usr/bin/env bash
# Registers the blog query index with the Configuration Service.
# The site's index config was not carried over when the content source changed.
#
# Usage:
#   1. Sign in at https://admin.hlx.page/login, copy the `auth_token` cookie
#   2. HLX_TOKEN='<paste>' ./drafts/da/register-index.sh
#   3. Publish the blog articles (upload.sh --publish) so they are indexed
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
. "${DIR}/_env.sh"
# target site: override with EDS_ORG / EDS_SITE in .env (e.g. the Cloud Manager site)
ORG="${EDS_ORG:-akaspanion}"
SITE="${EDS_SITE:-aem-eds-poc}"

: "${HLX_TOKEN:?Set HLX_TOKEN in .env or the shell (admin.hlx.page auth_token cookie)}"
[ -f "${DIR}/query-index.yaml" ] || { echo "missing ${DIR}/query-index.yaml"; exit 1; }

curl -sS -f -X POST -H "x-auth-token: ${HLX_TOKEN}" -H "Content-Type: text/yaml" \
  --data-binary "@${DIR}/query-index.yaml" \
  "https://admin.hlx.page/config/${ORG}/sites/${SITE}/content/query.yaml" -o /dev/null
echo "Index config saved."
curl -sS -f -H "x-auth-token: ${HLX_TOKEN}" \
  "https://admin.hlx.page/config/${ORG}/sites/${SITE}/content/query.yaml"
