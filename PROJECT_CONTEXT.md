# GalaxyGameDemo

Portable educational match-3. Tiles come from `GalaxyImagesByLevel/`. Matching is by **class** (subfolder). Unique `class/filename` on the board when the catalog is large enough. After a clear, survivors fall and new images spawn at the top.

本目录是可玩的星系消消乐：按类别匹配；图够时不重复文件；消除后下落补位。

## Modes

- **Campaign:** Easy / Normal / Hard. Clear `n = 20` successful matches (`CLEARS_TO_WIN`). Three stars: clear, clear within 90s (`STAR_TIME_LIMIT`), no hints. Easy is open; later levels need ≥1 star on the previous card.
- **Challenge:** `GalaxyImagesByLevel/Challange` (real folder spelling). Score + countdown, +3s per clear. Unlocks at 9 stars. Optional PNG result download.

战役为三关 20 消与三星；挑战为倒计时，9 星解锁。

## Layout

- `index.html` — portable game (inline CSS/JS, JPEG data URIs, no gzip)
- `GalaxyImagesByLevel/` — Easy, Normal, Hard, Challange; five classes each (FaceOnSpirals, EdgeOnDisk, Irregular, Elliptical, Group)
- `GalaxyImages4Class/` — older four-class set, unused by the current build
- `GalaxyImages/` — original ~6k set; local only, gitignored
- `tools/build_index.py` — rebuild `index.html`
- `tools/game.template.html` — game template
- `tools/verify_rules.cjs` — class-match, uniqueness/reuse, gravity, constants
- `update/` — change notes

## Rules that matter

- Match by `classId`; unique `class/filename` unless the catalog is smaller than the board (Easy)
- Board: 6×4 if unique count < 32, else 8×4
- Gravity from the top; hint after 3 failed swaps or 10s idle
- Clear FX: pop then shatter, score pulse; Challenge also **+3s**
- Progress: `localStorage` key `galaxyGameDemo.progress.v1`

## Latest update

[update/2026-10-08-three-levels-and-challenge.md](update/2026-10-08-three-levels-and-challenge.md)
