# Galaxy class match-3

Replaced fruit emoji tiles with the local `GalaxyImages/` catalog and shipped a portable `index.html`.

用本地星系目录替换水果格子，并生成可单独打开的 `index.html`。

## What changed

- Six morphology classes (folder names) are the match types: barred spiral, unbarred spiral, edge-on with/without bulge, smooth, irregular.
- Distinct photos from the same class match and clear when three or more are connected.
- The board is sized from the unique embedded image count. With 48 unique JPEGs (8 even samples per class) that is **8×4** (32 cells), leaving unused files for refill.
- A tile generator refuses any image id already on the board, so the same file never appears twice at once.
- Player copy is Chinese science notes with English class names; code and comments are English.
- Images are original JPEG bytes as data URIs (base64 only, no gzip).

## Rebuild

`python3 tools/build_index.py`

## Checks

`node tools/verify_rules.cjs`
