# v1.0 五类分级教学

**Five-class levels.** Galaxy classification match-3. 
v1.0 五类分级教学。

Educational match-3 from `GalaxyImagesByLevel/`. Matching is by **class** (subfolder), not identical pixels. Home selects Easy / Normal / Hard; Challenge uses the `Challange` folder after 9 stars. The player UI is bilingual (zh/en).

这是一个按星系形态分类的科普消消乐。主页选简单 / 普通 / 困难；集齐 9 星后开放挑战模式。玩家界面可中英切换。

## Dataset zip

数据集压缩包：

The image set is distributed as `GalaxyImagesByLevel.zip` in this project/repo. After clone or download, unzip it in the **project root** so `GalaxyImagesByLevel/Easy`, `Normal`, `Hard`, and `Challange` sit next to `index.html`. Opening `index.html` does **not** require unzipping: images are already embedded. Unzip before `./tools/rebuild_demo.sh` or before editing tiles.

图库以 `GalaxyImagesByLevel.zip` 随仓库分发。克隆后解压到项目根目录；直接打开 `index.html` 不必解压，重建或改图前需要解压。

## Play

打开方式 / how to play:

1. Open `index.html` in a browser (double-click, or a local server).
2. Optional:
   `python3 -m http.server 43191 --bind 127.0.0.1`
3. Campaign: swap adjacent tiles of the same morphological class. Reach **20** successful clears. Stars: clear the level; finish within **60s / 90s / 120s** (Easy / Normal / Hard); use **at most one** hint. Easy is a tutorial; after the first completion you can skip it (checked by default).
4. Challenge: score plus a 60s countdown (**+3s** per clear). Hints start at 3, cap at 3, and refill +1 per 10 successful clears. When a run ends, save a result PNG. Levels instead refill +1 every 10s.
5. Shortcuts: **Esc** pauses, **H** uses a hint. Language toggle is on the home screen and in play (default Chinese).

`index.html` is a single portable file (inline CSS/JS, JPEG data URIs).

`index.html` 可单独打开；图像以 JPEG 的 data URI 嵌入。

Progress lives in `localStorage` (`galaxyGameDemo.progress.v1`). The home console can reset all progress or unlock Challenge immediately.

进度保存在本机；主页控制台可重置或立刻解锁挑战。

## Board sizes

- Easy / Normal: **6×4**
- Hard / Challenge: **8×4**

## Rebuild

Swap images under `GalaxyImagesByLevel/{Easy,Normal,Hard,Challange}`, then rewrite the playable page:

```bash
./tools/rebuild_demo.sh
```

Same thing, without the wrapper: `python3 tools/build_index.py`. Both rewrite `index.html` (JPEG data URIs, no gzip). Template: `tools/game.template.html`. Optional check: `node tools/verify_rules.cjs`.

换图后运行上面的命令即可重建可玩的 `index.html`。

## Dataset

- **Distributed as:** `GalaxyImagesByLevel.zip` (unzip in the project root; see **Dataset zip** above).
- **Folder after unzip:** `GalaxyImagesByLevel/` — five classes (FaceOnSpirals, EdgeOnDisk, Irregular, Elliptical, Group / 星系团). Challenge folder spelling is `Challange`.

包含分关小目录。
