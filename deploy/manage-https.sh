#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Include an optional local image override without exposing credential values.
if [ -f compose.display.yaml ]; then
    exec docker compose -f compose.yaml -f compose.display.yaml -f compose.https.yaml "$@"
fi
exec docker compose -f compose.yaml -f compose.https.yaml "$@"
