# Gravity refill and stuck-play hints

Survivors now fall after a clear, and a valid swap is hinted when the player is stuck.

消除后改为下落补位；连续失败或空闲时提示一对可消交换。

## Gravity

- After pop/shatter, remaining tiles in a column pack downward.
- New unique images spawn only in the vacated cells at the top.
- Uncleared tiles keep the same `class/filename`; they only change row by falling.
- DOM img nodes are moved, not rebuilt, so the rest of the board does not flash.

## Hints

- **3 unsuccessful swaps** since the last successful clear, **or** **10 seconds** with no successful clear (whichever comes first).
- Highlights one random **valid** adjacent swap with a slow-blinking white border.
- Dismisses on a successful clear, or when the player swaps that hinted pair.
- Never hints a pair that would not match.

## Rebuild

`python3 tools/build_index.py`

## Checks

`node tools/verify_rules.cjs`
