# Deadlock reshuffle and gravity spawn fix

A settled board with no legal swap is fully reshuffled. Gravity no longer dumps the just-cleared class back into the same column.

无解时整盘重排；重力不再把刚消掉的一类整列填回去。

## Deadlock reshuffle / 死局重排

After the opening deal and after every gravity refill, if no adjacent swap would match, rebuild the whole board. Gravity itself is unchanged when a move still exists.

开局与每次下落停稳后，若没有可消交换，则整盘重排。

The rebuild plants a known pattern (`A A B` over `A`) so a valid swap is guaranteed, then fills the rest. Easy may repeat `class/filename`; Normal, Hard, and Challange stay unique. There is no ready-made 3-match. A short Chinese notice reports the rearrangement. Level progress, stars, timer, score, and hint charges are not reset.

重排会先种入已知可消再填满；进度与提示次数不变。

## Spawn / 补位

Cause: `pickUnusedTile` preferred files not currently on the board. After a vertical 3-clear, those files (same class) were the unused pool, so they dropped back into that column’s holes and matched again. That loop could fill all 20 clears by itself.

原因：优先补“场上没有的图”，竖直三消后同一类被立刻填回该列顶部，形成自消循环。

Fix: new tiles in one refill must not make a vertical 3 with each other or the survivor they land on, and must not make a horizontal 3 with other new tiles. The unused pool is not allowed to copy the just-cleared class into every hole. A later chain from genuinely different classes is still allowed.

同列同一次补位禁止立刻三连；不把刚消除的类填满所有空位。

## Rebuild / 重建

```bash
./tools/rebuild_demo.sh
```
