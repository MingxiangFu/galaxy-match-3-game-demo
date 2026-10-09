# Tutorial timer, challenge hint recovery, manual deadlock

Three rule splits: the Easy tutorial no longer burns the 60s star or the hint star; Challenge recovers hints by clears; a dead board waits for a center button.

教程不计时、不耗提示；挑战按消除回复提示；死锁需点中央按钮才刷新。

## Tutorial timer and hints

- While Easy tutorial steps are running, the level timer does not advance. Those seconds do not count toward the 60s star.
- A hint used during the tutorial does **not** spend a charge and does **not** count toward “at most 1 hint”.
- After the board unlocks for free play, the timer runs and hints spend charges and count as usual.

教程进行时冻结计时与提示消耗；解锁后恢复正常。

## Hint recovery

- **Easy / Normal / Hard:** start 3, cap 3, **+1 every 10s** while below the cap. Enter and pause modals show this 10s wording.
- **Challenge:** start 3, cap 3, **+1 per 10 successful clears**. Clears at the cap do not count toward the next charge. The hint button and challenge start/pause copy show progress such as `7/10`.

关卡仍按 10 秒回复；挑战改回每 10 消 +1，并显示进度。

## Manual deadlock

- After settle, if no legal swap remains, do **not** reshuffle immediately.
- Pause the timer, freeze input, dim the board, and show on-board copy: no removable pair, the game is paused, press the center button to refresh.
- Only that button plants a known move and restores play. Progress, score, stars, and hint charges stay put.
- The top pause modal (Esc) is separate; this overlay is the deadlock state.

无解时先暂停并等待中央按钮，不自动重排。
