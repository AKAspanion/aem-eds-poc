#!/usr/bin/env bash
# Switches the aem-eds-poc site's content source from AEM author to Document Authoring.
# The site is managed by the Configuration Service, so fstab.yaml is ignored.
#
# Usage:
#   1. Sign in at https://admin.hlx.page/login (same Adobe ID that set up the site)
#   2. DevTools > Application > Cookies > admin.hlx.page > copy the `auth_token` value
#   3. HLX_TOKEN='<paste>' ./drafts/da/switch-to-da.sh
#
# A backup of the current config is written next to this script before anything changes.
# Restore it with:
#   curl -X POST -H "x-auth-token: $HLX_TOKEN" -H "Content-Type: application/json" \
#     --data-binary @drafts/da/site-config-backup.json \
#     https://admin.hlx.page/config/akaspanion/sites/aem-eds-poc.json
set -euo pipefail

ORG=akaspanion
SITE=aem-eds-poc
DA_URL="https://content.da.live/${ORG}/${SITE}/"
API="https://admin.hlx.page/config/${ORG}/sites/${SITE}.json"
DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP="${DIR}/site-config-backup.json"
NEW="${DIR}/site-config-da.json"

: "${HLX_TOKEN:?Set HLX_TOKEN to your admin.hlx.page auth_token cookie}"

echo "Fetching current site config ..."
curl -sS -f -H "x-auth-token: ${HLX_TOKEN}" "${API}" -o "${BACKUP}"
echo "Backup saved to ${BACKUP}"

python3 -I - "${BACKUP}" "${NEW}" "${DA_URL}" <<'PY'
import json, sys
src, dst, da_url = sys.argv[1:4]
cfg = json.load(open(src))
old = cfg.get("content", {}).get("source", {})
print(f"  content source: {old.get('url')}  ->  {da_url}")
cfg["content"] = {"source": {"url": da_url, "type": "markup"}}
paths = cfg.get("public", {}).get("paths")
if paths:
    print(f"  removing AEM path mappings: {paths}")
    cfg["public"].pop("paths")
    if not cfg["public"]:
        cfg.pop("public")
# server-managed fields are not accepted on PUT
for k in ("created", "lastModified", "version", "name"):
    cfg.pop(k, None)
json.dump(cfg, open(dst, "w"), indent=2)
PY

echo "Writing new config ..."
# POST updates an existing site (PUT only creates one and returns 409 if it exists)
curl -sS -f -X POST -H "x-auth-token: ${HLX_TOKEN}" -H "Content-Type: application/json" \
  --data-binary "@${NEW}" "${API}" -o /dev/null

echo "Verifying ..."
curl -sS -f -H "x-auth-token: ${HLX_TOKEN}" "${API}" | python3 -I -c '
import json, sys
cfg = json.load(sys.stdin)
print("  content source:", cfg.get("content", {}).get("source", {}).get("url"))
print("  path mappings: ", cfg.get("public", {}).get("paths") or "none")'
echo "Done. Now open each page in da.live (nav, footer, index) and click Preview."
