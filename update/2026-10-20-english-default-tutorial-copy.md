# English default and new-player tutorial copy

A first visit with no saved language now opens in English. The zh/en toggle still persists, and a stored Chinese choice still loads Chinese. Tutorial pages tell new players what each control does.

首次访问且尚未保存语言时默认英文。中英切换仍会记住；已保存的中文会继续用中文。教程改为说明控件做什么。

## Default language

`defaultProgress().lang` is `"en"`. Missing `progress.lang` is treated as English. `parsed.lang === "zh"` still restores Chinese.

默认语言为英文；只有已保存的 `zh` 才显示中文。

## Animation page

The Slow/Fast page no longer locates the control as “left of Hint” (Hint has not been taught yet). It points at the highlighted speed button and says it switches between a slow slide and a fast swap.

动画页不再用「提示左边」定位；直接说这个按钮在慢速滑动和快速交换之间切换。

## Pause page

Pause copy says what happens: the timer stops, and a window shows progress and the star rules. It no longer says the board “will not reset” (that was leftover from the old restart-button bug).

暂停页说明计时停止并弹出进度/三星窗口，不再提「不会重置」。

## Other player-facing lines

The ask-tutorial lead no longer mentions power-ups while powers are off. Gravity no longer mentions Pause before that page. Finish just asks the player to tap End tutorial. Challenge pause lead says the countdown is stopped.

询问教程的说明去掉技能；下落页不再提前提暂停；结束页只说明点结束教程。
