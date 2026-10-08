#!/usr/bin/env bash
# Rebuild the portable index.html from GalaxyImagesByLevel/ (no gzip).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 "$ROOT/tools/build_index.py"
