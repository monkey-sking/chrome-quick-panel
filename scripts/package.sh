#!/usr/bin/env bash
# Build the Chrome Web Store upload ZIP into dist/.
# The `key` field is stripped: the Web Store assigns its own extension ID.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
import pathlib
import zipfile

root = pathlib.Path(".")
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
manifest.pop("key", None)
version = manifest["version"]

out = root / "dist" / f"chrome-quick-panel-{version}.zip"
out.parent.mkdir(exist_ok=True)

files = ["background.js", "popup.html", "popup.css", "popup.js"]
files += [f"icons/icon{size}.png" for size in (16, 32, 48, 128)]

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
    archive.writestr(
        "manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    for name in files:
        archive.write(root / name, name)

print(f"built {out} ({out.stat().st_size} bytes)")
with zipfile.ZipFile(out) as archive:
    for info in archive.infolist():
        print(f"  {info.filename}  {info.file_size}B")
PY
