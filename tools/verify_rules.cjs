/**
 * Checks for 5-class matching, per-level catalogs, uniqueness with Easy reuse,
 * gravity refill, hints, campaign constants, and challenge countdown rules.
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

function extractJson(name) {
    const token = "const " + name + " = ";
    const start = html.indexOf(token);
    if (start < 0) throw new Error("missing " + name);
    const from = start + token.length;
    const slice = html.slice(from);
    const end = slice.search(/;\nconst /);
    if (end < 0) throw new Error("could not bound " + name);
    return JSON.parse(slice.slice(0, end));
}

const GALAXY_DATA = extractJson("GALAXY_DATA");
const EXPECTED_FOLDERS = ["Easy", "Normal", "Hard", "Challange"];
const EXPECTED_CLASSES = ["EdgeOnDisk", "Elliptical", "FaceOnSpirals", "Group", "Irregular"];

function sizeBoardFromUniqueCount(uniqueCount) {
    if (uniqueCount >= 32) return { rows: 4, cols: 8, cells: 32 };
    return { rows: 4, cols: 6, cells: 24 };
}

function findMatches(board, rows, cols) {
    const matches = new Set();
    for (let r = 0; r < rows; r++) {
        let count = 1;
        for (let c = 1; c < cols; c++) {
            const same = board[r][c] && board[r][c - 1] &&
                board[r][c].classId === board[r][c - 1].classId;
            if (same) count += 1;
            else {
                if (count >= 3) for (let k = c - count; k < c; k++) matches.add(r + "," + k);
                count = 1;
            }
        }
        if (count >= 3) for (let k = cols - count; k < cols; k++) matches.add(r + "," + k);
    }
    for (let c = 0; c < cols; c++) {
        let count = 1;
        for (let r = 1; r < rows; r++) {
            const same = board[r][c] && board[r - 1][c] &&
                board[r][c].classId === board[r - 1][c].classId;
            if (same) count += 1;
            else {
                if (count >= 3) for (let k = r - count; k < r; k++) matches.add(k + "," + c);
                count = 1;
            }
        }
        if (count >= 3) for (let k = rows - count; k < rows; k++) matches.add(k + "," + c);
    }
    return [...matches];
}

function idsOnBoard(board) {
    const used = new Set();
    for (const row of board) for (const tile of row) if (tile) used.add(tile.id);
    return used;
}

function pickUnusedTile(catalog, board, usedExtra) {
    const occupied = usedExtra || idsOnBoard(board);
    const unused = catalog.filter((item) => !occupied.has(item.id));
    if (unused.length) return unused[Math.floor(Math.random() * unused.length)];
    if (!catalog.length) return null;
    return catalog[Math.floor(Math.random() * catalog.length)];
}

function wouldOpenMatch(board, r, c, classId) {
    if (c >= 2 && board[r][c - 1] && board[r][c - 2] &&
        board[r][c - 1].classId === classId && board[r][c - 2].classId === classId) return true;
    if (r >= 2 && board[r - 1][c] && board[r - 2][c] &&
        board[r - 1][c].classId === classId && board[r - 2][c].classId === classId) return true;
    return false;
}

function initBoard(catalog, rows, cols) {
    const used = new Set();
    const board = [];
    const requireUnique = catalog.length >= rows * cols;
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            let chosen = null;
            for (let attempt = 0; attempt < 24; attempt++) {
                const candidate = pickUnusedTile(catalog, board, used);
                if (!candidate) return null;
                if (wouldOpenMatch(board, r, c, candidate.classId)) continue;
                chosen = candidate;
                break;
            }
            if (!chosen) chosen = pickUnusedTile(catalog, board, used);
            if (!chosen) return null;
            board[r][c] = { id: chosen.id, classId: chosen.classId };
            used.add(chosen.id);
        }
    }
    if (findMatches(board, rows, cols).length) return null;
    if (requireUnique) {
        const ids = [];
        for (const row of board) for (const tile of row) ids.push(tile.id);
        if (new Set(ids).size !== ids.length) return null;
    }
    return board;
}

function classRun(col, r, classId, rows) {
    let n = 1;
    for (let rr = r - 1; rr >= 0; rr--) {
        if (!col[rr] || col[rr].classId !== classId) break;
        n += 1;
    }
    for (let rr = r + 1; rr < rows; rr++) {
        if (!col[rr] || col[rr].classId !== classId) break;
        n += 1;
    }
    return n;
}

function horizRun(newBoard, r, c, classId, cols) {
    let n = 1;
    for (let cc = c - 1; cc >= 0; cc--) {
        if (!newBoard[r][cc] || newBoard[r][cc].classId !== classId) break;
        n += 1;
    }
    for (let cc = c + 1; cc < cols; cc++) {
        if (!newBoard[r][cc] || newBoard[r][cc].classId !== classId) break;
        n += 1;
    }
    return n;
}

function pickGravitySpawn(catalog, col, newBoard, r, c, used, rows, cols) {
    const requireUnique = catalog.length >= rows * cols;
    for (let attempt = 0; attempt < 60; attempt++) {
        const next = pickUnusedTile(catalog, newBoard, used);
        if (!next) break;
        if (classRun(col, r, next.classId, rows) >= 3) continue;
        if (horizRun(newBoard, r, c, next.classId, cols) >= 3) continue;
        return next;
    }
    let pool = catalog.filter((item) =>
        classRun(col, r, item.classId, rows) < 3 &&
        horizRun(newBoard, r, c, item.classId, cols) < 3
    );
    if (requireUnique) {
        const uniquePool = pool.filter((item) => !used.has(item.id));
        if (uniquePool.length) pool = uniquePool;
    }
    if (!pool.length) {
        pool = catalog.filter((item) => classRun(col, r, item.classId, rows) < 3);
    }
    if (!pool.length) throw new Error("no image for gravity spawn");
    return pool[Math.floor(Math.random() * pool.length)];
}

function gravityFill(catalog, board, rows, cols, cleared) {
    const snapshot = board.map((row) => row.map((tile) => tile && tile.id));
    for (const pos of cleared) board[pos.r][pos.c] = null;
    const used = idsOnBoard(board);
    const survivorOrder = [];
    const newBoard = Array.from({ length: rows }, () => new Array(cols));
    for (let c = 0; c < cols; c++) {
        const kept = [];
        for (let r = 0; r < rows; r++) {
            if (board[r][c]) kept.push(board[r][c]);
        }
        survivorOrder.push(kept.map((tile) => tile.id));
        const holes = rows - kept.length;
        const col = new Array(rows);
        for (let i = 0; i < kept.length; i++) col[holes + i] = kept[i];
        for (let i = 0; i < holes; i++) {
            const next = pickGravitySpawn(catalog, col, newBoard, i, c, used, rows, cols);
            col[i] = { id: next.id, classId: next.classId };
            used.add(next.id);
        }
        for (let r = 0; r < rows; r++) newBoard[r][c] = col[r];
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) board[r][c] = newBoard[r][c];
    }
    for (let c = 0; c < cols; c++) {
        const packed = [];
        for (let r = 0; r < rows; r++) packed.push(board[r][c].id);
        const keptIds = survivorOrder[c];
        const tail = packed.slice(rows - keptIds.length);
        if (tail.join() !== keptIds.join()) {
            throw new Error("survivors did not fall as a packed column");
        }
    }
    const requireUnique = catalog.length >= rows * cols;
    if (requireUnique) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const id = snapshot[r][c];
                if (!id) continue;
                const wasCleared = cleared.some((pos) => pos.r === r && pos.c === c);
                if (wasCleared) continue;
                let found = false;
                for (let rr = r; rr < rows; rr++) {
                    if (board[rr][c].id === id) found = true;
                }
                if (!found) throw new Error("survivor vanished instead of falling: " + id);
                for (let rr = 0; rr < r; rr++) {
                    if (board[rr][c].id === id) throw new Error("survivor rose upward: " + id);
                }
            }
        }
    }
}

function findValidSwaps(board, rows, cols) {
    const pairs = [];
    function swap(a, b) {
        const t = board[a.r][a.c];
        board[a.r][a.c] = board[b.r][b.c];
        board[b.r][b.c] = t;
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const nbrs = [];
            if (c + 1 < cols) nbrs.push({ r, c: c + 1 });
            if (r + 1 < rows) nbrs.push({ r: r + 1, c });
            for (const n of nbrs) {
                swap({ r, c }, n);
                const hits = findMatches(board, rows, cols);
                swap({ r, c }, n);
                if (hits.length >= 3) pairs.push({ a: { r, c }, b: n });
            }
        }
    }
    return pairs;
}

const folders = Object.keys(GALAXY_DATA).sort();
if (folders.join(",") !== EXPECTED_FOLDERS.slice().sort().join(",")) {
    throw new Error("expected folders " + EXPECTED_FOLDERS.join(",") + " got " + folders.join(","));
}

for (const folder of EXPECTED_FOLDERS) {
    const catalog = GALAXY_DATA[folder];
    const classes = [...new Set(catalog.map((item) => item.classId))].sort();
    const ids = catalog.map((item) => item.id);
    const size = sizeBoardFromUniqueCount(catalog.length);
    console.log(folder, "classes", classes.length, classes.join(","), "images", ids.length, "board", size.cols + "x" + size.rows);
    if (classes.join(",") !== EXPECTED_CLASSES.join(",")) {
        throw new Error(folder + " expected 5 classes, got " + classes.join(","));
    }
    if (new Set(ids).size !== ids.length) throw new Error(folder + " has duplicate ids");
    if (!catalog.every((item) => item.src.startsWith("data:image/jpeg;base64,"))) {
        throw new Error(folder + " images should be jpeg data URIs");
    }
    if (folder === "Easy" && (size.cols !== 6 || size.rows !== 4)) throw new Error("Easy should be 6x4");
    if (folder === "Normal" && (size.cols !== 6 || size.rows !== 4)) throw new Error("Normal should be 6x4");
    if (folder === "Hard" && (size.cols !== 8 || size.rows !== 4)) throw new Error("Hard should be 8x4");
    if (folder === "Challange" && (size.cols !== 8 || size.rows !== 4)) throw new Error("Challange should be 8x4");

    const sameClass = catalog.filter((item) => item.classId === "FaceOnSpirals");
    if (sameClass.length < 1) throw new Error(folder + " missing FaceOnSpirals");
    if (sameClass.length >= 3) {
        const toy = [[sameClass[0], sameClass[1], sameClass[2], catalog.find((item) => item.classId !== "FaceOnSpirals")]];
        if (findMatches(toy, 1, 4).length !== 3) throw new Error(folder + " class match failed");
    } else {
        const toy = [[sameClass[0], sameClass[0], sameClass[0], catalog.find((item) => item.classId !== "FaceOnSpirals")]];
        if (findMatches(toy, 1, 4).length !== 3) throw new Error("Easy-style class match failed");
    }

    const differentClassRow = [[
        catalog.find((item) => item.classId === "Elliptical"),
        catalog.find((item) => item.classId === "Irregular"),
        catalog.find((item) => item.classId === "FaceOnSpirals"),
        catalog.find((item) => item.classId === "EdgeOnDisk"),
        catalog.find((item) => item.classId === "Group")
    ]];
    if (findMatches(differentClassRow, 1, 5).length !== 0) {
        throw new Error("different classes should not match");
    }

    for (let i = 0; i < 30; i++) {
        let board = null;
        let pairs = [];
        for (let n = 0; n < 80; n++) {
            board = initBoard(catalog, size.rows, size.cols);
            if (!board) continue;
            pairs = findValidSwaps(board, size.rows, size.cols);
            if (pairs.length) break;
            board = null;
        }
        if (!board) throw new Error(folder + " failed to build a legal opening board with a hint swap");
        const onBoard = [];
        for (const row of board) for (const tile of row) onBoard.push(tile.id);
        if (catalog.length >= size.cells && new Set(onBoard).size !== onBoard.length) {
            throw new Error(folder + " duplicate image file on board");
        }
        gravityFill(catalog, board, size.rows, size.cols, [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }]);
        const after = [];
        for (const row of board) for (const tile of row) after.push(tile.id);
        if (catalog.length >= size.cells && new Set(after).size !== after.length) {
            throw new Error(folder + " duplicate after gravity");
        }
        const spawnClass = [board[0][2].classId, board[1][2].classId, board[2][2].classId];
        if (spawnClass[0] === spawnClass[1] && spawnClass[1] === spawnClass[2]) {
            throw new Error(folder + " vertical refill spawned three of the same class");
        }
    }

    for (let i = 0; i < 20; i++) {
        let board = null;
        for (let n = 0; n < 80; n++) {
            board = initBoard(catalog, size.rows, size.cols);
            if (board && findValidSwaps(board, size.rows, size.cols).length) break;
            board = null;
        }
        if (!board) throw new Error(folder + " no opening board for vertical-clear spawn test");
        const target = catalog.find((item) => item.classId === "FaceOnSpirals");
        const other = catalog.find((item) => item.classId !== "FaceOnSpirals");
        board[0][2] = { id: other.id, classId: other.classId };
        board[1][2] = { id: target.id, classId: target.classId };
        board[2][2] = { id: target.id, classId: target.classId };
        board[3][2] = { id: target.id, classId: target.classId };
        gravityFill(catalog, board, size.rows, size.cols, [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }]);
        if (board[0][2].classId === board[1][2].classId && board[1][2].classId === board[2][2].classId) {
            throw new Error(folder + " same-class self-clear loop after vertical 3");
        }
        const colMatches = findMatches(board, size.rows, size.cols).filter((key) => key.endsWith(",2"));
        const spawnTriple = ["0,2", "1,2", "2,2"].every((key) => colMatches.includes(key));
        if (spawnTriple) throw new Error(folder + " new column stack instantly matched");
    }
}

const required = [
    ["CLEARS_TO_WIN = 20", "20-clear win constant"],
    ["STAR_TIME = { easy: 60, normal: 90, hard: 120 }", "per-level star times"],
    ["STAR3_HINT_MAX = 1", "star 3 allows one hint"],
    ["TIME_BONUS = 3", "+3s time bonus"],
    ["HINT_CHARGE_MAX = 3", "hint charge cap"],
    ["HINT_REFILL_SEC = 10", "level hint refill every 10s"],
    ["HINT_CLEAR_EVERY = 10", "challenge hint every 10 clears"],
    ["function useHint()", "manual hint button"],
    ["tickHintRefill", "timed hint refill"],
    ["grantChallengeHintProgress", "challenge clear-count refill"],
    ["refreshDeadBoard", "manual deadlock refresh"],
    ["tickPlayClock", "clock tick helper"],
    ["STORAGE_KEY = \"galaxyGameDemo.progress.v1\"", "progress storage key"],
    ["CHALLENGE_FOLDER = \"Challange\"", "Challange folder spelling"],
    ["bonus-float", "+3s popup"],
    ["tileShatter", "shatter animation"],
    ["hintBlink", "hint blink"],
    ["planGravity", "gravity planner"],
    ["tileFall", "fall animation"],
    ["saveChallengePng", "challenge PNG save"],
    ["unlockChallengeNow", "console unlock"],
    ["resetAllProgress", "console reset"],
    ["win-stars .on", "results filled-star style"],
    ["fitPlayLayout", "viewport fit"],
    ["onclick=\"pauseRun()\">暂停", "top pause control"],
    ["ensurePlayableBoard", "deadlock reshuffle"],
    ["reshuffleBoardPlanted", "planted-move reshuffle"],
    ["pickGravitySpawn", "match-aware gravity spawn"],
    ["buildTutorialBoard", "Easy tutorial board"],
    ["skipTutorial", "skip tutorial checkbox"],
    ["function toggleLang()", "language toggle"],
    ["onKeyDown", "Esc/H shortcuts"]
];
const forbidden = [
    ["FAIL_HINT_COUNT", "auto-hint after misses"],
    ["IDLE_HINT_MS", "auto-hint after idle"],
    ["HINT_CHARGE_EVERY = 10", "old +1 per 10 clears"]
];
const playChunk = html.slice(html.indexOf('id="playArea"'), html.indexOf('id="briefOverlay"'));
if (playChunk.includes("restartCurrentRun")) {
    throw new Error("play footer should not reset the run");
}
for (const [token, label] of required) {
    if (!html.includes(token)) throw new Error("missing " + label);
}
for (const [token, label] of forbidden) {
    if (html.includes(token)) throw new Error("should not include " + label);
}

console.log("ok: 5-class matching, ByLevel catalogs, uniqueness/reuse, gravity, stars, challenge");
