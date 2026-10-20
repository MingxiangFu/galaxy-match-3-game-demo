# Slow animation, rewritten tutorial, hint highlight, and class power-ups

Added four player-facing systems to the portable demo. Rules, catalogs, and the one-file rebuild stay the same.

给可移植演示加上慢速动画、重写教程、提示高亮和五类技能，规则和单文件重建方式不变。

## Animation speed

A Fast / Slow toggle sits at the top right, immediately left of Hint. Fast keeps the old short swap nudge. Slow slides the two tiles into each other’s places, then either shatters a match or slides them back. The choice is stored in `localStorage` (`progress.animSpeed`). Matching, scoring, gravity, and stars are unchanged.

右上角提示按钮左侧增加快/慢切换；慢速会滑过去再消除或滑回。选择会记住。规则不变。

## Easy tutorial

The first Easy screen asks whether to take the tutorial, before the level-intro / three-star modal. No skips to the normal intro. Yes opens a guided page list: how-to-play (class, swap, pop, gravity), pause, hint, then a page that opens the pause modal and explains the three stars plus 9-star Challenge unlock, then one page per power-up, then a last page whose **结束教程** button sits in the callout, not in the Next slot.

Ask-first overlay; Yes 才进引导。顺序：玩法 → 暂停 → 提示 → 三星规则 → 五个技能 → 结束教程。

The mask leaves the focused control or tiles visible. Copy is large white text with a black outline and underlined keywords. The bottom bar is 上一步 / `n / total` / 下一步. Back is disabled on page 1. Next does not require the player to perform the action. The timer stays frozen; tutorial hints do not spend charges or count toward star 3. After the first completion, the ask overlay still appears, with **No** as the default.

半透明遮罩、描边大字、底栏翻页；可不做操作直接下一步。教程不计时、不耗提示。完成一次后默认选「直接开始」。

## Hint button highlight

If 15 seconds pass with no successful clear, or the player makes 5 failed swaps, the hint button pulses. This does not spend a charge and does not show a swap pair. A successful clear or using Hint removes the highlight. It applies in levels and Challenge.

15 秒无成功消除或 5 次失败交换后只高亮提示按钮，不自动提示、不扣次数。

## Class power-ups

The bottom class row now shows a localized name, a one-line effect, and charge `n / 5`. `POWER_CHARGE_COST` is 5 successful clears of that class. A full charge highlights; click to arm (faster blink), click again to cancel, then click a tile to fire. Using a power spends the charge back to 0.

底部类别行改为技能：名称、效果、5 次充能。充满后点选再点格子发动，用完清零。

- Face-on spirals: rotate the surrounding ring clockwise by one step. On an edge, only existing neighbors move, still in clockwise order.
- Edge-on disk: clear the target’s whole row. Those tiles do not count toward the level total, score, or power charge.
- Irregular: shuffle the 3×3 around the target, with a visible wobble. On an edge, only on-board cells shuffle.
- Elliptical: clear the target only. Same: no clear-count, score, or charge.
- Galaxy group: highlight every tile of the target’s class until the player swaps or uses Hint.

正向旋涡转一圈；侧向盘消整行；不规则打乱 3×3；椭圆消一格；星系团高亮同类。贴边只处理棋盘上的格。整行/单格不计分。

Rotate and shuffle do not score by themselves. If they create a normal 3-match, that match uses the normal clear rules. Tutorial pages explain each power; they do not require spending a charge.

旋转/打乱本身不得分；若因此出现三连，按普通消除计。教程只讲解，不强制放技能。

## Kept

Manual hints (levels +1 / 10s, Challenge +1 / 10 clears with `n/10`), Esc / H, deadlock center-button reshuffle, gravity, no same-class column self-clear, 60 / 90 / 120 star times, language toggle, and local progress. `./tools/rebuild_demo.sh` still rebuilds `index.html`.

提示、快捷键、死局刷新、下落、三星与双语进度均保留。重建命令不变。
