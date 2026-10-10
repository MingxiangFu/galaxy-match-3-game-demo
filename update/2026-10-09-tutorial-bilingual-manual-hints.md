# Tutorial, bilingual UI, and manual hints

Easy is now a scripted tutorial. Hints are player-controlled in every mode. The player UI is Chinese/English with a persisted toggle.

简单关改为教程；提示全部手动；玩家界面中英切换并记住选择。

## Tutorial (Easy)

- First Easy run uses a **fixed opening board** (`A A B` over `A`) and a guided sequence: class match → swap → pop/clear → gravity refill → pause (Esc) and stars → hint (button or H) → swap the hinted pair → unlock.
- During a step, only the taught tiles or control are interactive. **Pause (button and Esc) always works.**
- After the last step the board unlocks so the player can finish 20 clears. Completion is stored as `tutorialDone` in `localStorage`.
- After the first completion, the Easy start modal shows **Skip tutorial**, **checked by default**. The first run has no skip checkbox.
- The scripted hint spends **one** charge and counts toward stars.

教程按步锁定可点区域；完成后可跳过，默认勾选。

## Stars and times

- Time star: Easy **60s**, Normal **90s**, Hard **120s**. Enter, pause, and results copy use that limit.
- Third star: hints used **≤ 1** (a second hint forfeits star 3). The tutorial’s single guided hint can still earn three stars.

限时按关卡；第三星允许一次提示。

## Hints

- No auto-hints (removed 3-miss and 10s-idle triggers) on Easy, Normal, Hard, and Challenge.
- Same button model everywhere: start with **3** charges, cap **3**.
- Recovery is **+1 charge every 10s while below the cap** (not +1 per 10 clears).
- Challenge start modal explains what differs from levels: score per clear, **+3s** on the timer per clear, and this 10s hint refill.

提示改为手动，并按时间回复次数。

## Shortcuts and language

- **Esc** pauses (ignored when a modal is already open).
- **H** spends a hint charge like the button; ignored when a hint is not allowed.
- Language toggle on the home screen and in play. Default **Chinese**. Choice persists in `localStorage`. Class labels stay `zh · en`. Tutorial, modals, stars, challenge rules, and the deadlock-reshuffle notice are translated.

Esc 暂停、H 提示；语言默认中文并跨刷新保持。
