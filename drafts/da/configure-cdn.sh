#!/usr/bin/env bash
# Adobe-managed CDN: tells Edge Delivery the production host so publishing
# purges the CDN (push invalidation), and sitemap/canonical URLs use it.
# Run against the site Cloud Manager's CDN mapping points at (its main-- origin).
#
# Prerequisites (Cloud Manager, done by the program admin):
#   1. Edge Delivery site registered in Cloud Manager (program p62213)
#   2. Certificates for www + apex, domains added, CDN config mapping the domain
#      to https://main--<site>--<org>.aem.live
#   3. DNS: www CNAME -> cdn.adobeaemcloud.com; apex A -> 151.101.3.10,
#      151.101.67.10, 151.101.131.10, 151.101.195.10 (TTL >= 3600)
#
# Usage: set HLX_TOKEN, PROD_HOST (bare host, e.g. www.example.com) and, for the
# Cloud Manager site, EDS_ORG / EDS_SITE in .env, then ./drafts/da/configure-cdn.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
. "${DIR}/_env.sh"
# target site: override with EDS_ORG / EDS_SITE in .env (e.g. the Cloud Manager site)
ORG="${EDS_ORG:-akaspanion}"
SITE="${EDS_SITE:-aem-eds-poc}"

: "${HLX_TOKEN:?Set HLX_TOKEN in .env or the shell (admin.hlx.page auth_token cookie)}"
: "${PROD_HOST:?Set PROD_HOST in .env (bare production host, e.g. www.example.com)}"
host="${PROD_HOST#https://}"; host="${host#http://}"; host="${host%/}"

echo "Setting cdn.prod for ${ORG}/${SITE}: host=${host}, type=managed"
curl -sS -f -X POST -H "x-auth-token: ${HLX_TOKEN}" -H "Content-Type: application/json" \
  --data "{\"prod\":{\"host\":\"${host}\",\"type\":\"managed\"}}" \
  "https://admin.hlx.page/config/${ORG}/sites/${SITE}/cdn.json" -o /dev/null
curl -sS -f -H "x-auth-token: ${HLX_TOKEN}" "https://admin.hlx.page/config/${ORG}/sites/${SITE}/cdn.json"
echo
echo "Next: re-run ./drafts/da/apply-seo-config.sh so robots.txt and the sitemap use https://${host}"
