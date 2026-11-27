#!/bin/bash
# Preserve the optional native IPC overlay when applying app image updates.
set -euo pipefail
project_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$project_root"
if [ "$#" -eq 0 ]; then set -- app; fi
native_enabled=$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('backend/appsettings.json')
value=json.loads(p.read_text()).get('NativeVerification',{}).get('Enabled',False)
print('1' if value is True else '0')
PY
)
if [ "$native_enabled" = 1 ]; then
 export GFC_HOST_ROOT="$project_root"
 exec docker compose -f compose.yaml -f compose.native.yaml up -d --no-build "$@"
fi
exec docker compose up -d --no-build "$@"
