# GalaxyGameDemo

Playable educational match-3. Tiles come from `GalaxyImages4Class/` (4 morphology classes). Matching is by **class** (subfolder). The same image file never appears twice. After a clear, survivors fall and new unique images spawn at the top.

本目录是可玩的四类星系消消乐：按类别匹配，图像不重复；消除后下落补位。

## Layout

- `index.html` — portable game (inline CSS/JS, JPEG data URIs)
- `GalaxyImages4Class/` — FaceOnSpirals, EdgeOnDisk, Irregular, Smooth (shipped)
- `GalaxyImages/` — original ~6k set; **local only**, gitignored, not in the GitHub zip
- `tools/build_index.py` — rebuild `index.html`
- `tools/game.template.html` — game template
- `tools/verify_rules.cjs` — uniqueness, class-match, gravity, hint checks
- `update/` — change notes

## Rules that matter

- Match by `classId`; unique `class/filename` on the board
- Gravity: survivors fall down, new tiles only at the top
- Hint: 3 failed swaps **or** 10s without a clear — blink a valid pair
- Clear FX: pop then shatter, score pulse, **+3s**

## Latest update

[update/2026-09-19-github-upload-package.md](update/2026-09-19-github-upload-package.md)
