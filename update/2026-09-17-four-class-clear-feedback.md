# Four-class catalog, clear feedback, in-place refill

Switched the portable match-3 to `GalaxyImages4Class/` and stopped the full-board flicker on clear.

把棋盘换成四类星系图，并去掉整盘刷新造成的闪烁。

## Catalog

- Classes: FaceOnSpirals, EdgeOnDisk, Irregular, Smooth
- Embed 12 even samples per class (48 unique JPEGs as data URIs, no gzip)
- Board still sizes from unique count: 48 → 8×4

## Clear feedback

- Matched tiles scale/pop, then shatter with shards and a particle burst
- Score in the top-right pulses (scale up, then down) when it changes
- Each successful clear adds **+3s**; a green **+3s** label appears beside the clearing tiles

## Refill

- Survivors keep the same image at the same cell
- Only cleared cells receive a new unused `class/filename`
- No gravity, no reshuffle, no `innerHTML` rebuild of the whole board on select/swap/clear

## Rebuild

`python3 tools/build_index.py`

## Checks

`node tools/verify_rules.cjs`
