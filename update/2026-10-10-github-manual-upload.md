# GitHub manual upload (since 2026-09-19)

This package replaces the 2026-09-19 four-class zip. Open `index.html` to play. After changing images, run `./tools/rebuild_demo.sh` (same as `python3 tools/build_index.py`). Do not gzip the JPEG payloads.

本包替换 2026-09-19 的四类图压缩包。打开 `index.html` 即可玩；换图后运行 `./tools/rebuild_demo.sh`。

## What changed since the 4-class package

相对 2026-09-19 四类包的变化：

- **Catalog:** playable tiles now come from `GalaxyImagesByLevel/` with **five classes** (FaceOnSpirals, EdgeOnDisk, Irregular, Elliptical, Group). The challenge folder spelling on disk is `Challange`. Matching is by class (subfolder), not identical pixels. Unique `class/filename` when the catalog is large enough; Easy may reuse because it has only one image per class.
- **图库：** 五类分关目录；挑战文件夹名为 `Challange`；按类匹配。
- **Modes:** home screen with **Easy / Normal / Hard** campaign plus **Challenge**. Campaign wins at **20** successful clears. Easy is open; later levels need ≥1 star on the previous card. Challenge unlocks at **9 stars** (or the home console). Challenge uses a countdown, **score per clear**, and **+3s** on the timer per clear; a PNG result can be saved.
- **模式：** 三关战役 + 挑战；20 消通关；9 星解锁挑战。
- **Stars and time limits:** three stars per level — clear the level; finish within **Easy 60s / Normal 90s / Hard 120s**; use **at most 1 hint**. Result stars show only stars earned.
- **星级：** 通关、限时 60/90/120 秒、提示不超过 1 次。
- **Tutorial:** Easy is a scripted tutorial on a fixed opening board. After the first completion, the start modal offers **Skip tutorial**, checked by default. During tutorial steps the **timer is frozen** and the guided hint does **not** spend a charge or count toward star 3. After unlock, time and hints behave normally.
- **教程：** 简单关引导；完成后默认可跳过；教程中不计时、不耗提示。
- **Hints:** manual in every mode (button or **H**). Start 3, cap 3, no auto-hint. **Levels:** +1 charge every **10s** while below the cap. **Challenge:** +1 charge per **10 successful clears**; clears at the cap do not count; the button shows progress such as `7/10`.
- **提示：** 关卡每 10 秒 +1；挑战每 10 消 +1，并显示 n/10。
- **Shortcuts and language:** **Esc** pauses. **H** uses a hint (ignored when not allowed). Player UI is bilingual (zh/en) with a toggle on home and in play; default Chinese; the choice persists.
- **快捷键与语言：** Esc 暂停，H 提示；中英切换，默认中文。
- **Pause:** top **Pause** control. Pause does not reset the board, score, stars, or hint charges.
- **暂停：** 不重置进度。
- **Gravity:** after a clear, survivors fall and new images spawn at the top. Spawns must not instantly form a vertical/horizontal 3 of the same class (no same-class column self-clear).
- **下落：** 顶部补位；禁止补出即消的同类三连。
- **Deadlock:** if a settled board has no legal swap, the game **pauses and waits**. A center button refreshes the board and plants a known move. Progress is kept. This overlay is separate from the pause modal.
- **死锁：** 不自动重排，需点棋盘中央按钮刷新。
- **Rebuild:** `./tools/rebuild_demo.sh` rewrites portable `index.html` (inline CSS/JS, JPEG data URIs, no gzip). Template: `tools/game.template.html`. Optional: `node tools/verify_rules.cjs`.
- **重建：** 运行 `./tools/rebuild_demo.sh`。

## How to play and rebuild

如何打开与重建：

1. Open `index.html` in a browser (double-click or `python3 -m http.server`).
2. To swap tiles, replace files under `GalaxyImagesByLevel/{Easy,Normal,Hard,Challange}` then run `./tools/rebuild_demo.sh`.

## Package contents / 打包内容

Included: `index.html`, `tools/`, `GalaxyImagesByLevel/`, `README.md`, `PROJECT_CONTEXT.md`, `update/`, `.gitignore`.

Excluded: original `GalaxyImages/` (~6k images), `.git/`, `.DS_Store`, `__pycache__`, zips, secrets. The unused `GalaxyImages4Class/` set is not in this zip.

Progress stays in the browser (`localStorage` key `galaxyGameDemo.progress.v1`). No accounts.
