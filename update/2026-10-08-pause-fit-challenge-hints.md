# Pause, viewport fit, result stars, challenge hints

In-level pause no longer resets. The play screen fits the browser height. Result stars show earned vs empty. Challenge hints are a limited button.

关内暂停不再重置；对局界面适配窗口高度；结算星级区分已得/未得；挑战提示改为次数按钮。

## Pause / 暂停

The in-level control is **暂停** at the **top** of the play screen. It opens the existing progress modal at the current clears, elapsed time, and star forfeits, without rebuilding the board. **重新开始** stays inside that modal.

顶部暂停打开当前进度弹窗；重新开始仍在弹窗内。

## Viewport / 高度适配

The play shell uses the viewport height. The board shrinks so the top pause control and the bottom message stay on-screen at 100% zoom. Pause stays sticky at the top if a very short window still overflows.

对局棋盘随窗口变矮；暂停固定在顶部。

## Result stars / 结算星级

The results overlay fills only earned stars (gold). Unearned stars stay dim/empty, so 1-star, 2-star, and 3-star endings look different.

结算只点亮实际获得的星。

## Challenge hints / 挑战提示

Campaign still auto-hints after 3 missed swaps or 10s idle. Challenge does not. A top **提示 N** button spends one charge to highlight a valid swap. Start with **3**. Every **10** successful clears grant **+1**, cap **3**. Clears do not count toward the next charge while already at the cap.

挑战仅按钮提示：开局 3 次，每 10 消 +1，上限 3。

## Rebuild / 重建

```bash
./tools/rebuild_demo.sh
```

Rewrites `index.html` from the current `GalaxyImagesByLevel/` tree (Easy, Normal, Hard, Challange). No gzip.

从分关图库重建便携页面。
