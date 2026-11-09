#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./app.json').expo.version")
notes=$(gh release view "v$version" --json body --jq .body 2>/dev/null || true)
if [ -z "$notes" ]; then
  echo "No GitHub release for v$version. Tag it and write its notes first; they become TestFlight's \"What to Test\"." >&2
  exit 1
fi

npm run check
npx eas-cli build -p ios --profile production --auto-submit --non-interactive --no-wait

# EAS only sends "What to Test" on its Enterprise plan, so paste these notes into TestFlight once the build is processed.
printf '\nWhat to Test for TestFlight:\n\n%s\n' "$notes"
