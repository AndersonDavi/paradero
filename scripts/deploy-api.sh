#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run check
rm -rf dist
npx expo export -p web 2>&1 | tee /tmp/paradero-export.log
if grep -qE "Metro error|Error:" /tmp/paradero-export.log; then
  echo "Export reported an error. Not deploying." >&2
  exit 1
fi

if [ -f .env.local ]; then
  while IFS='=' read -r name value; do
    [ -n "${value:-}" ] && grep -rqF -- "$value" dist && { echo "$name leaked into dist. Not deploying." >&2; exit 1; }
  done < <(grep -E '^[A-Z_]+=.+' .env.local)
fi

npx eas-cli deploy --prod --environment production --non-interactive
