# Hide powers for this version; keep End tutorial on the right

Players no longer see or use power-ups. The implementation stays in the template behind `POWERS_ENABLED = false`. The finish-tutorial control sits on the right of the bottom bar, not in the Next slot.

本版不对玩家开放技能；代码保留在开关后。结束教程在底栏右侧，不在「下一步」位置。

## Powers gated off

`POWERS_ENABLED` is false. The bottom row is only a representative image and the class name in the current language. There is no charge number, meter, or click-to-arm. `onPowerClick` and tile firing return immediately while the flag is off. Setting the constant to true restores the previous power UI and tutorial pages.

`POWERS_ENABLED = false`。底部只显示代表图和当前语言的类名。点技能无效。改为 true 可恢复。

## Tutorial skips power pages

The full page list, including the shared usage page and the five effect pages, remains in `TUTOR_PAGES`. While powers are off, `tutorPages()` omits those steps so the guided tour does not teach a hidden feature.

教程页定义仍保留；技能关闭时跳过用法页和五个效果页。

## End tutorial on the right

**结束教程** is a separate button on the right side of the tutorial bar. 下一步 stays in its own slot and is disabled on the last page, so the two cannot be mis-tapped as one control.

结束教程在底栏右侧，与下一步分开。
