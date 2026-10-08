#!/usr/bin/env python3
"""Build a portable index.html with inline CSS/JS and embedded galaxy JPEGs.

Images are stored as uncompressed data URIs (raw JPEG bytes, base64 only).
Catalogs are keyed by GalaxyImagesByLevel folder names (including Challange).
"""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVEL_ROOT = ROOT / "GalaxyImagesByLevel"
TEMPLATE = Path(__file__).resolve().parent / "game.template.html"
OUTPUT = ROOT / "index.html"

# Real on-disk folder names. "Challange" is the user's spelling.
LEVEL_FOLDERS = ["Easy", "Normal", "Hard", "Challange"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    return "application/octet-stream"


def collect_folder(folder: Path) -> list[dict]:
    if not folder.is_dir():
        raise SystemExit(f"Missing level folder: {folder}")
    catalog = []
    class_dirs = sorted(p for p in folder.iterdir() if p.is_dir())
    for class_dir in class_dirs:
        files = sorted(
            p
            for p in class_dir.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS and not p.name.startswith(".")
        )
        if not files:
            print(f"skip {folder.name}/{class_dir.name}: no images")
            continue
        for path in files:
            raw = path.read_bytes()
            data_uri = "data:" + mime_for(path) + ";base64," + base64.b64encode(raw).decode("ascii")
            catalog.append(
                {
                    "id": f"{class_dir.name}/{path.name}",
                    "classId": class_dir.name,
                    "file": path.name,
                    "src": data_uri,
                }
            )
    if not catalog:
        raise SystemExit(f"No galaxy images in {folder}")
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed per-level galaxy images into index.html")
    parser.parse_args()

    template = TEMPLATE.read_text(encoding="utf-8")
    if "__GALAXY_DATA__" not in template:
        raise SystemExit("Template is missing __GALAXY_DATA__ placeholder")

    if not LEVEL_ROOT.is_dir():
        raise SystemExit(f"Missing dataset folder: {LEVEL_ROOT}")

    catalogs = {}
    for name in LEVEL_FOLDERS:
        catalogs[name] = collect_folder(LEVEL_ROOT / name)
        classes = sorted({item["classId"] for item in catalogs[name]})
        print(f"{name}: {len(classes)} classes, {len(catalogs[name])} unique images ({', '.join(classes)})")

    payload = json.dumps(catalogs, ensure_ascii=False, separators=(",", ":"))
    html = template.replace("__GALAXY_DATA__", payload)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUTPUT}")
    print(f"index.html size: {OUTPUT.stat().st_size} bytes (no gzip; JPEG bytes base64-encoded only)")


if __name__ == "__main__":
    main()
