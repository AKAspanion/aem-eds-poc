# Sourced by the DA scripts: loads KEY=value lines from the repo-root .env.
# Variables already set in the shell (e.g. DA_TOKEN='...' ./upload.sh) win.
_env_file="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.env"
if [ -f "$_env_file" ]; then
  while IFS= read -r _line || [ -n "$_line" ]; do
    _line="${_line%$'\r'}"
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _key="${_line%%=*}"
    _val="${_line#*=}"
    _key="${_key//[[:space:]]/}"
    [[ "$_key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -n "${!_key:-}" ] && continue
    # strip one pair of surrounding quotes
    if [[ "$_val" =~ ^\"(.*)\"$ ]] || [[ "$_val" =~ ^\'(.*)\'$ ]]; then _val="${BASH_REMATCH[1]}"; fi
    export "$_key=$_val"
  done < "$_env_file"
fi
unset _env_file _line _key _val
