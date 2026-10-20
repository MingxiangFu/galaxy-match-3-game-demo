# Tutorial rewind, shared power-use page, and charge meter

The Easy tutorial now rewinds the board when stepping back, explains how to charge and fire powers before the five effects, and each power shows a red/green charge meter beside `x/5`.

简单关教程可回退棋盘；技能效果页前增加用法页；充能旁有红绿格子。

## Shared power-use page

Before the five per-power pages, one page states the shared rule in short player copy: charge by clearing that class 5 times, then tap the power, then tap the target tile. Key words are underlined. The mask and large outlined callout match the other pages.

五个技能页之前先讲共同用法：同类消 5 次充满，再点技能、再点目标格。关键词有下划线。

## Lighter board mask

The overlay over the board is lighter so the galaxy images stay easy to see. Tiles that are not the current target still cannot be clicked.

棋盘上的遮罩更透明，方便看图；非当前目标格仍不可点。

## Board snapshots on 上一步

Each tutorial page stores a board snapshot. 上一步 restores that page’s tiles, selection, and any scripted clear, so “swap these two” still works after a later clear. The level timer is not rewound, and hint charges are not spent or restored.

每页记住棋盘。上一步只恢复格子和选择，不改计时、不消耗提示次数。

## Hint refill copy

The hint page also states both refill rules and the cap: levels regain 1 charge every 10s, cap 3; Challenge regains 1 every 10 successful clears, cap 3.

提示页补充两种恢复规则与上限 3 次。

## Charge meter

To the right of each power’s `x/5` label, the UI draws `n` cells (`n` = `POWER_CHARGE_COST`, currently 5). Filled cells are green; empty cells are red. The meter follows charge in both languages.

`x/5` 右侧有 5 格：已充满为绿，未充满为红。中英界面都会更新。
