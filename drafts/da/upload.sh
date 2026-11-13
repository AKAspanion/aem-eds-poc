#!/usr/bin/env bash
# Uploads every page under drafts/da/ to Document Authoring, then previews
# (and optionally publishes) each one.
#
# Usage:
#   1. Sign in at https://da.live/#/akaspanion/aem-eds-poc and in DevTools run:
#        copy(window.adobeIMS.getAccessToken().token)
#   2. Optional but recommended for preview/publish: sign in at https://admin.hlx.page/login
#      and copy the `auth_token` cookie (DevTools > Application > Cookies).
#   3. DA_TOKEN='<da token>' HLX_TOKEN='<admin token>' ./drafts/da/upload.sh [--publish] [path ...]
#
#   --publish   also publish to aem.live (needed for the blog listing's query index)
#   path ...    only these files, relative to drafts/da (e.g. about-us.html nav.html)
#
# Tokens stay in your shell; nothing here stores them.
set -uo pipefail

ORG=akaspanion
SITE=aem-eds-poc
DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLISH=false
FILES=()

for arg in "$@"; do
  case "$arg" in
    --publish) PUBLISH=true ;;
    *) FILES+=("$arg") ;;
  esac
done

: "${DA_TOKEN:?Set DA_TOKEN to your da.live IMS access token}"

if [ ${#FILES[@]} -eq 0 ]; then
  # nav and footer first so pages render with them on first preview
  while IFS= read -r f; do FILES+=("$f"); done < <(
    cd "$DIR" && { ls nav.html footer.html 2>/dev/null; find . -type f \( -name '*.html' -o -name '*.json' \) \
      ! -name 'site-config-*' ! -name 'nav.html' ! -name 'footer.html' | sed 's|^\./||' | sort; }
  )
fi

admin_headers=(-H "Authorization: Bearer ${DA_TOKEN}")
[ -n "${HLX_TOKEN:-}" ] && admin_headers+=(-H "x-auth-token: ${HLX_TOKEN}")

# web path for a DA file: index.html -> /, a/b.html -> /a/b, a/b.json -> /a/b.json
web_path() {
  local f="$1"
  case "$f" in
    index.html) echo "/" ;;
    */index.html) echo "/${f%index.html}" ;;
    *.html) echo "/${f%.html}" ;;
    *) echo "/$f" ;;
  esac
}

fail=0
admin_call() {
  local action="$1" path="$2" code err
  code=$(curl -sS -o /dev/null -D /tmp/da-upload-headers -w '%{http_code}' -X POST "${admin_headers[@]}" \
    "https://admin.hlx.page/${action}/${ORG}/${SITE}/main${path}")
  err=$(grep -i '^x-error:' /tmp/da-upload-headers | cut -d' ' -f2- | tr -d '\r')
  if [[ "$code" =~ ^2 ]]; then printf ' %s ok' "$action"; else printf ' %s FAILED (%s %s)' "$action" "$code" "$err"; fail=1; fi
}

for f in "${FILES[@]}"; do
  src="${DIR}/${f}"
  [ -f "$src" ] || { echo "skip $f (not found)"; continue; }
  type=text/html; [[ "$f" == *.json ]] && type=application/json
  path=$(web_path "$f")
  printf '%-45s' "$path"
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${DA_TOKEN}" \
    -F "data=@${src};type=${type}" "https://admin.da.live/source/${ORG}/${SITE}/${f}")
  if [[ "$code" =~ ^2 ]]; then printf ' upload ok'; else printf ' upload FAILED (%s)\n' "$code"; fail=1; continue; fi
  admin_call preview "$path"
  $PUBLISH && admin_call live "$path"
  echo
done

echo
echo "Preview: https://main--${SITE}--${ORG}.aem.page/"
$PUBLISH && echo "Live:    https://main--${SITE}--${ORG}.aem.live/"
[ $fail -eq 0 ] || echo "Some steps failed. For preview/publish failures, set HLX_TOKEN, or use Preview/Publish in da.live."
exit $fail
