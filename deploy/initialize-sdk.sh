#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Run once after installing a new Linux SDK/device package. Generates the SDK's
# device defaults with a trusted fixture, before the API mounts the SDK read-only.
docker compose build
docker run --rm --user root \
  -v "$PWD/runtime/sdk:/opt/connectiq" \
  -v "$PWD/runtime/garmin:/home/app/.Garmin/ConnectIQ:ro" \
  -v "$PWD/runtime/secrets/developer_key:/key:ro" \
  -v "$PWD/deploy/sdk-fixture:/project:ro" \
  --entrypoint java garminfacecreator-app \
  -Duser.home=/home/app -jar /opt/connectiq/bin/monkeybrains.jar \
  -f /project/monkey.jungle -d venu445mm -o /tmp/fixture.prg -y /key
chmod a+r runtime/sdk/bin/default.jungle
docker compose up -d
