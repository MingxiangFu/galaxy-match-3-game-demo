# Three campaign levels and Challenge mode

Three difficulty catalogs plus a countdown Challenge, with local star progress.

三关战役 + 倒计时挑战，星级进度保存在本机。

## Campaign levels / 战役关卡

Home is a level select: Easy, Normal, Hard. Images come from `GalaxyImagesByLevel/Easy`, `Normal`, and `Hard`. Each folder has five classes: FaceOnSpirals, EdgeOnDisk, Irregular, Elliptical, and Group (星系团).

主页为简单 / 普通 / 困难选关，图像分别来自上述三个目录。

Diversity rises Easy → Hard (one exemplar per class on Easy; more distinct photos later). Clear condition is `CLEARS_TO_WIN = 20` successful clears. Best clear time is stored on the level card.

同类图像多样性随难度升高；通关需 20 次成功消除，并记录最佳用时。

Stars (`STAR_TIME_LIMIT = 90`):

1. Clear the level.
2. Clear within 90 seconds.
3. Clear with zero hints triggered.

三星条件：通关、90 秒内、全程未触发提示。

Easy is open. Normal / Hard stay locked until the previous level has at least one star. Enter and pause show a modal with progress toward n, elapsed time, star conditions, forfeits (hint loses star 3; elapsed > 90s loses star 2; play can continue for star 1), and restart.

简单默认开放；上一关至少 1 星才解锁下一关。进入/暂停弹窗展示进度与已失去的星。

## Challenge / 挑战模式

Uses the five-class set in `GalaxyImagesByLevel/Challange` (on-disk spelling). Keeps point score and countdown (`GAME_TIME = 60`, `TIME_BONUS = 3`). Unlock when all 9 stars are earned, or immediately from the home console. A finished run can save a PNG (score + duration) drawn on a canvas in-page.

挑战使用 Challange 图库；9 星解锁。结束时可在页面内绘制并下载成绩 PNG。

## Persistence / 本地进度

`localStorage` key `galaxyGameDemo.progress.v1` stores stars, best times, and challenge unlock. No accounts. Home console: reset all progress, or unlock Challenge immediately.

进度键见上；主页控制台可重置或立刻解锁挑战。

## Board sizes / 棋盘

- Easy, Normal: 6×4 (catalog < 32 unique images)
- Hard, Challange: 8×4 (catalog ≥ 32)

Match by class; unique `class/filename` when the catalog is large enough. Easy reuses the single exemplar per class so three-of-a-kind is possible. Gravity still packs down and spawns at the top. Pop/shatter, score pulse, and hint blink are unchanged.

按类别匹配；图够时文件不重复。简单关允许重复代表图。重力、爆裂与提示闪烁保持原样。

## Rebuild / 重建

```bash
python3 tools/build_index.py
node tools/verify_rules.cjs
```
