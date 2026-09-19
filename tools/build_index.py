#!/usr/bin/env python3
"""Build a portable index.html with inline CSS/JS and embedded galaxy JPEGs.

Images are stored as uncompressed data URIs (raw JPEG bytes, base64 only).
"""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_ROOT = ROOT / "GalaxyImages4Class"
TEMPLATE = Path(__file__).resolve().parent / "game.template.html"
OUTPUT = ROOT / "index.html"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def sample_evenly(paths: list[Path], count: int) -> list[Path]:
    """Pick visually spread files from a sorted class folder."""
    if count <= 0:
        return []
    if len(paths) <= count:
        return list(paths)
    last = len(paths) - 1
    picked = []
    seen = set()
    for i in range(count):
        index = round(i * last / (count - 1))
        if index in seen:
            index = next(j for j in range(len(paths)) if j not in seen)
        seen.add(index)
        picked.append(paths[index])
    return picked


def mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    return "application/octet-stream"


def collect_catalog(per_class: int) -> list[dict]:
    if not IMAGE_ROOT.is_dir():
        raise SystemExit(f"Missing dataset folder: {IMAGE_ROOT}")

    class_dirs = sorted(p for p in IMAGE_ROOT.iterdir() if p.is_dir())
    catalog = []
    for class_dir in class_dirs:
        files = sorted(
            p
            for p in class_dir.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS and not p.name.startswith(".")
        )
        if len(files) < 3:
            print(f"skip {class_dir.name}: need at least 3 unique images, found {len(files)}")
            continue
        for path in sample_evenly(files, per_class):
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
        raise SystemExit("No galaxy images could be embedded.")
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed galaxy images into index.html")
    parser.add_argument(
        "--per-class",
        type=int,
        default=12,
        help="Unique images to embed from each class folder (default: 12)",
    )
    args = parser.parse_args()

    template = TEMPLATE.read_text(encoding="utf-8")
    if "__GALAXY_DATA__" not in template:
        raise SystemExit("Template is missing __GALAXY_DATA__ placeholder")

    catalog = collect_catalog(args.per_class)
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    html = template.replace("__GALAXY_DATA__", payload)
    OUTPUT.write_text(html, encoding="utf-8")

    classes = sorted({item["classId"] for item in catalog})
    bytes_out = OUTPUT.stat().st_size
    print(f"wrote {OUTPUT}")
    print(f"classes: {len(classes)} ({', '.join(classes)})")
    print(f"unique images: {len(catalog)}")
    print(f"index.html size: {bytes_out} bytes (no gzip; JPEG bytes base64-encoded only)")


if __name__ == "__main__":
    main()
