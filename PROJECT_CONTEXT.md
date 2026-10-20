# GalaxyGameDemo

Portable educational match-3. Tiles come from `GalaxyImagesByLevel/`. Matching is by **class** (subfolder). Unique `class/filename` on the board when the catalog is large enough. After a clear, survivors fall and new images spawn at the top.

本目录是可玩的星系消消乐：按类别匹配；图够时不重复文件；消除后下落补位。玩家界面中英双语。

## Modes

- **Campaign:** Easy / Normal / Hard. Clear `n = 20` successful matches (`CLEARS_TO_WIN`). Three stars: clear the level; finish within the level time (Easy 60s / Normal 90s / Hard 120s); use **at most one** hint. Easy asks whether to take the tutorial before the intro modal. Later levels need ≥1 star on the previous card.
- **Challenge:** `GalaxyImagesByLevel/Challange` (real folder spelling). Score + countdown, +3s per clear. Unlocks at 9 stars. Optional PNG result download. Start modal explains score, +3s, and +1 hint per 10 clears.

战役为三关 20 消与三星；简单关先询问教程；挑战为倒计时，9 星解锁。

## Layout

- `index.html` — portable game (inline CSS/JS, JPEG data URIs, no gzip)
- `GalaxyImagesByLevel/` — Easy, Normal, Hard, Challange; five classes each (FaceOnSpirals, EdgeOnDisk, Irregular, Elliptical, Group)
- `GalaxyImages4Class/` — older four-class set, unused by the current build
- `GalaxyImages/` — original ~6k set; local only, gitignored
- `tools/rebuild_demo.sh` — one-command rebuild of `index.html` from `GalaxyImagesByLevel/`
- `tools/build_index.py` — embedder used by the wrapper
- `tools/game.template.html` — game template
- `tools/verify_rules.cjs` — class-match, uniqueness/reuse, gravity, constants
- `tools/verify_browser.cjs` — headless Chrome checks for locks, stars, tutorial, challenge, PNG
- `update/` — change notes

## Rules that matter

- Match by `classId`; unique `class/filename` unless the catalog is smaller than the board (Easy)
- Board: 6×4 if unique count < 32, else 8×4
- Gravity from the top; after settle, if no legal swap remains, pause and wait for a center **refresh** button (planted move). Do not auto-reshuffle.
- Gravity spawns must not instant-match; unused files of the just-cleared class are not dumped back as a stack
- Hints are **manual** (button or **H**). Levels: 3 charges, cap 3, **+1 every 10s**. Challenge: **+1 per 10 clears**, with `n/10` progress; clears at the cap do not count. No auto-hint. After 15s without a successful clear or 5 failed swaps, only the hint **button** is highlighted.
- Easy tutorial freezes the timer and does not spend/count hints. After the first completion, the ask overlay defaults to skip. 上一步 restores that page’s board snapshot. Power tutorial pages stay in code but are skipped while `POWERS_ENABLED` is false. Back / page / Next are centered; **结束教程** stays on the right. The original page-4 topic (**gravity / 下落补位**) and page-8 topic (**finish / 教程结束**) use centered outlined copy, a full board mask, and a disabled board. A short Slow-animation page sits after pop.
- Swap animation: Slow is the default for new players; the Slow/Fast button switches between a slow slide and a fast swap. Persisted as `progress.animSpeed`.
- Class row currently shows a larger representative image and the localized class name only, five-across on one row. Power-up code stays gated behind `POWERS_ENABLED = false`.
- Pause is at the top (**Esc**); the timer stops and a window shows progress and star rules
- Player language: default English on a fresh visit, toggle persists (`progress.lang`); a saved Chinese choice still loads Chinese
- Progress: `localStorage` key `galaxyGameDemo.progress.v1`

## Latest update

[update/2026-10-20-english-default-tutorial-copy.md](update/2026-10-20-english-default-tutorial-copy.md)
