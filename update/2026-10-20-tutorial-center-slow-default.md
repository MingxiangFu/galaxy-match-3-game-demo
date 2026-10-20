# Center the tutorial bar, lock gravity/finish, default slow

The Easy tour now centers Back / page / Next, keeps **结束教程** on the right, and treats the original page-4 and page-8 **topics** (not whatever later sits at those indexes) as full-screen, non-playable explainers. New players start in Slow animation, with one extra page that says so. Class chips are larger and stay on one row.

教程底栏居中；结束教程仍在右侧。插入新页前的第 4 页（下落补位）和第 8 页（教程结束）改为居中文案并锁死棋盘。新玩家默认慢速，并多一页说明。底部类别图和名称更大，仍是单行。

## Recorded pages before the insert

Before adding any page, the 8-step tour (powers off) was:

1. class / 按类匹配
2. swap / 交换
3. pop / 消除
4. **gravity / 下落补位**
5. pause / 暂停
6. hint / 提示
7. stars / 三星
8. **finish / 教程结束**

Those two named topics still get the center-text and disabled-board treatment after the new page is inserted.

插入前第 4 页是下落补位，第 8 页是教程结束；之后仍按主题处理，不按页码。

## Tutorial bar

上一步, the page indicator, and 下一步 sit in a centered nav group. **结束教程** stays in its own right-hand slot, never in Next.

底栏中间是上一步 / 页码 / 下一步；结束教程仍在右侧。

## Gravity and finish are dead, centered explainers

`TUTOR_CENTER_LOCK_PAGES` is `gravity` and `finish`. On those topics the large outlined copy is centered on the screen, the mask covers the board (no hole), and `tutorialAllowCells` is `none`, so players cannot click or clear while the tutorial timer is frozen. Finish no longer unlocks the board; play starts only after **结束教程**.

下落补位和教程结束：文案居中、遮罩盖住棋盘、不可点击。结束页不再提前解锁。

## Slow animation default and new page

New progress defaults to `animSpeed: "slow"`. The Fast/Slow toggle still sits immediately left of Hint. A new `anim` page follows **pop** and precedes **gravity**. It tells players that tiles slide, then shatter or slide back, and that the button left of Hint switches speed. With powers off the tour is **1 / 9**.

新玩家默认慢速；在消除页之后增加一页说明滑动/碎裂和左侧快慢按钮。技能关闭时共 9 页。

## Larger class row

Each class chip shows a bigger sample image and localized name, still five-across on one row. The 900px two-column wrap is gone, so a narrow window does not stack chips or overlap labels.

类别代表图和名称更大；窄屏仍保持五个一排、互不重叠。
