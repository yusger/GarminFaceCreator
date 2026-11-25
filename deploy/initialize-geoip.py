"""Download pinned public offline IP databases; never uploads visitor data."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "deploy/geoip-manifest.json").read_text())
destination = root / "runtime/geoip"
destination.mkdir(parents=True, exist_ok=True)
for name, item in manifest["files"].items():
    data = urllib.request.urlopen(item["url"], timeout=120).read()
    if hashlib.sha256(data).hexdigest() != item["sha256"]:
        raise RuntimeError("IP database checksum mismatch: " + name)
    temporary = destination / (name + ".tmp")
    temporary.write_bytes(data)
    temporary.replace(destination / name)
    print("Verified", name)
