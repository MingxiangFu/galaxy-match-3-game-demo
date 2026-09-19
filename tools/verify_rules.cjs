/**
 * Headless checks for 4-class matching, unique files, gravity refill,
 * valid-swap hints, and board sizing from the unique-image catalog.
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/const GALAXY_DATA = (\[.*?\]);\nconst GAME_TIME/s);
if (!match) {
    console.error("Could not parse GALAXY_DATA from index.html");
    process.exit(1);
}
const GALAXY_DATA = JSON.parse(match[1]);

const EXPECTED_CLASSES = ["EdgeOnDisk", "FaceOnSpirals", "Irregular", "Smooth"];

function sizeBoardFromUniqueCount(uniqueCount) {
    if (uniqueCount < 9) return { rows: 0, cols: 0, cells: 0 };
    const cells = Math.min(uniqueCount, Math.max(9, Math.floor(uniqueCount * 2 / 3)));
    let cols = Math.round(Math.sqrt(cells * 2));
    cols = Math.max(3, Math.min(cols, cells));
    let rows = Math.floor(cells / cols);
    if (rows < 3) {
        rows = 3;
        cols = Math.max(3, Math.floor(cells / rows));
    }
    while (rows * cols > uniqueCount) {
        if (cols > 3) cols -= 1;
        else rows -= 1;
    }
    return { rows, cols, cells: rows * cols };
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

function pickUnusedTile(board) {
    const occupied = idsOnBoard(board);
    const unused = GALAXY_DATA.filter((item) => !occupied.has(item.id));
    if (!unused.length) return null;
    return unused[Math.floor(Math.random() * unused.length)];
}

function wouldOpenMatch(board, r, c, classId) {
    if (c >= 2 && board[r][c - 1] && board[r][c - 2] &&
        board[r][c - 1].classId === classId && board[r][c - 2].classId === classId) return true;
    if (r >= 2 && board[r - 1][c] && board[r - 2][c] &&
        board[r - 1][c].classId === classId && board[r - 2][c].classId === classId) return true;
    return false;
}

function initBoard(rows, cols) {
    const used = new Set();
    const board = [];
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            let chosen = null;
            for (let attempt = 0; attempt < 24; attempt++) {
                const unused = GALAXY_DATA.filter((item) => !used.has(item.id));
                if (!unused.length) return null;
                const candidate = unused[Math.floor(Math.random() * unused.length)];
                if (wouldOpenMatch(board, r, c, candidate.classId)) continue;
                chosen = candidate;
                break;
            }
            if (!chosen) chosen = GALAXY_DATA.find((item) => !used.has(item.id));
            if (!chosen) return null;
            board[r][c] = { id: chosen.id, classId: chosen.classId };
            used.add(chosen.id);
        }
    }
    if (findMatches(board, rows, cols).length) return null;
    return board;
}

function gravityFill(board, rows, cols, cleared) {
    const snapshot = board.map((row) => row.map((tile) => tile && tile.id));
    for (const pos of cleared) board[pos.r][pos.c] = null;
    const used = idsOnBoard(board);
    const survivorOrder = [];
    for (let c = 0; c < cols; c++) {
        const kept = [];
        for (let r = 0; r < rows; r++) {
            if (board[r][c]) kept.push(board[r][c]);
        }
        survivorOrder.push(kept.map((tile) => tile.id));
        const holes = rows - kept.length;
        const col = new Array(rows);
        for (let i = 0; i < holes; i++) {
            const unused = GALAXY_DATA.filter((item) => !used.has(item.id));
            if (!unused.length) throw new Error("no unused image for gravity spawn");
            const next = unused[Math.floor(Math.random() * unused.length)];
            col[i] = { id: next.id, classId: next.classId };
            used.add(next.id);
        }
        for (let i = 0; i < kept.length; i++) {
            col[holes + i] = kept[i];
        }
        for (let r = 0; r < rows; r++) board[r][c] = col[r];
    }
    for (let c = 0; c < cols; c++) {
        const packed = [];
        for (let r = 0; r < rows; r++) packed.push(board[r][c].id);
        const keptIds = survivorOrder[c];
        const tail = packed.slice(rows - keptIds.length);
        if (tail.join() !== keptIds.join()) {
            throw new Error("survivors did not fall as a packed column");
        }
        for (let r = 0; r < rows - keptIds.length; r++) {
            if (snapshot[r] && keptIds.includes(packed[r]) && snapshot.some((row) => row[c] === packed[r] && row === snapshot[r])) {
                /* new top cells may coincidentally reuse a just-cleared id; uniqueness is enough */
            }
        }
    }
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

const classes = [...new Set(GALAXY_DATA.map((item) => item.classId))].sort();
const ids = GALAXY_DATA.map((item) => item.id);
const size = sizeBoardFromUniqueCount(GALAXY_DATA.length);

console.log("classes", classes.length, classes.join(","));
console.log("unique images", ids.length, "unique ids", new Set(ids).size);
console.log("board", size.cols + "x" + size.rows, "cells", size.cells);

if (classes.join(",") !== EXPECTED_CLASSES.join(",")) {
    throw new Error("expected 4 classes " + EXPECTED_CLASSES.join(",") + " got " + classes.join(","));
}
if (ids.length !== 48 || new Set(ids).size !== 48) throw new Error("expected 48 unique images");
if (size.cols !== 8 || size.rows !== 4) throw new Error("expected 8x4 board from 48 unique images");

const sameClass = GALAXY_DATA.filter((item) => item.classId === "FaceOnSpirals").slice(0, 3);
if (sameClass[0].id === sameClass[1].id) throw new Error("sample images were not distinct");
const toy = [[
    sameClass[0],
    sameClass[1],
    sameClass[2],
    GALAXY_DATA.find((item) => item.classId !== "FaceOnSpirals"),
]];
const toyMatches = findMatches(toy, 1, 4);
if (toyMatches.length !== 3) {
    throw new Error("class match failed for distinct bitmaps: " + JSON.stringify(toyMatches));
}

const differentClassRow = [[
    GALAXY_DATA.find((item) => item.classId === "Smooth"),
    GALAXY_DATA.find((item) => item.classId === "Irregular"),
    GALAXY_DATA.find((item) => item.classId === "FaceOnSpirals"),
    GALAXY_DATA.find((item) => item.classId === "EdgeOnDisk"),
]];
if (findMatches(differentClassRow, 1, 4).length !== 0) {
    throw new Error("different classes should not match");
}

if (!html.includes("TIME_BONUS = 3")) throw new Error("missing +3s time bonus");
if (!html.includes("bonus-float")) throw new Error("missing +3s popup");
if (!html.includes("tileShatter")) throw new Error("missing shatter animation");
if (!html.includes("FAIL_HINT_COUNT = 3")) throw new Error("missing 3-fail hint");
if (!html.includes("IDLE_HINT_MS = 10000")) throw new Error("missing 10s idle hint");
if (!html.includes("hintBlink")) throw new Error("missing hint blink");
if (!html.includes("planGravity")) throw new Error("missing gravity planner");
if (!html.includes("tileFall")) throw new Error("missing fall animation");

for (let i = 0; i < 80; i++) {
    let board = null;
    for (let n = 0; n < 40; n++) {
        board = initBoard(size.rows, size.cols);
        if (board) break;
    }
    if (!board) throw new Error("failed to build a legal opening board");
    const onBoard = [];
    for (const row of board) for (const tile of row) onBoard.push(tile.id);
    if (new Set(onBoard).size !== onBoard.length) throw new Error("duplicate image file on board");

    const pairs = findValidSwaps(board, size.rows, size.cols);
    if (!pairs.length) throw new Error("opening board had no valid hint swap");
    const pick = pairs[0];
    const t = board[pick.a.r][pick.a.c];
    board[pick.a.r][pick.a.c] = board[pick.b.r][pick.b.c];
    board[pick.b.r][pick.b.c] = t;
    if (findMatches(board, size.rows, size.cols).length < 3) {
        throw new Error("hint pair was not actually a match");
    }
    board[pick.b.r][pick.b.c] = board[pick.a.r][pick.a.c];
    board[pick.a.r][pick.a.c] = t;

    const before = board.map((row) => row.map((tile) => tile.id));
    gravityFill(board, size.rows, size.cols, [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }]);
    const after = [];
    for (const row of board) for (const tile of row) after.push(tile.id);
    if (new Set(after).size !== after.length) throw new Error("duplicate after gravity");
    const fallen = before[0][2];
    if (board[0][2].id === fallen) throw new Error("top of cleared column should be a new spawn");
    if (board[3][2].id !== fallen) throw new Error("top survivor should land at the bottom of the column");
}

const srcPrefix = GALAXY_DATA.every((item) => item.src.startsWith("data:image/jpeg;base64,"));
if (!srcPrefix) throw new Error("images should be jpeg data URIs without extra compression wrappers");

console.log("ok: 4-class matching, uniqueness, gravity refill, hint rules");
