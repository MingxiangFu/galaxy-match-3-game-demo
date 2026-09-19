# GitHub upload package

Prepared a colleague-ready tree and zip. No GitHub remote: this Mac cannot install `gh`.

为同事二次开发准备可手动上传的文件包；本机无法安装 `gh`，不创建远程仓库。

## Included

- `index.html`, `tools/`, `GalaxyImages4Class/`, `README.md`, `PROJECT_CONTEXT.md`, `update/`, `.gitignore`

## Excluded

- Original `GalaxyImages/` (~6000 images)
- `.DS_Store`, `__pycache__`, secrets, `.git/` inside the zip
- Git LFS not used; no gzip of image payloads

## Suggested repo

Public GitHub repository named `GalaxyGameDemo`. Open `index.html` to play; rebuild with `python3 tools/build_index.py`.
