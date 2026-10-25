#!/usr/bin/env sh
# Builds the web app and deploys everything to the selected Firebase project.
#
#   npm run deploy            # rules + indexes + storage rules + functions + hosting
#   npm run deploy:backend    # everything except the web build
#
# Needs: `firebase use <project>` done once (or FIREBASE_TOKEN in CI), a Blaze
# project, and `firebase functions:secrets:set PHONE_HASH_PEPPER` run once.
set -eu
cd "$(dirname "$0")/.."

# `expo export` bakes EXPO_PUBLIC_* into the bundle. A .env left pointing at
# the emulators would ship a web app that talks to 127.0.0.1.
if [ -f .env ] && grep -q '^EXPO_PUBLIC_FIREBASE_EMULATOR=1' .env; then
  echo "refusing to deploy: .env has EXPO_PUBLIC_FIREBASE_EMULATOR=1 (emulator config)" >&2
  echo "put the real web app config from the Firebase console in .env first" >&2
  exit 1
fi

if ! npx firebase use >/dev/null 2>&1; then
  echo "no Firebase project selected: run  npx firebase use --add" >&2
  exit 1
fi

backend="firestore,storage:rules,functions"

case "${1:-all}" in
  backend)
    npx firebase deploy --only "$backend"
    ;;
  all)
    rm -rf dist
    npx expo export --platform web
    npx firebase deploy --only "$backend,hosting"
    ;;
  *)
    echo "usage: deploy.sh [all|backend]" >&2
    exit 2
    ;;
esac
