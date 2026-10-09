/**
 * Headless Chrome checks for locks, stars, forfeits, challenge gate, console, reload, PNG.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PAGE = process.argv[2] || "http://127.0.0.1:43193/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9337;
const DOWNLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "galaxy-png-"));

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = "";
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => {
                try { resolve(JSON.parse(body)); }
                catch (err) { reject(new Error(body.slice(0, 200))); }
            });
        }).on("error", reject);
    });
}

class Cdp {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.id = 0;
        this.pending = new Map();
        this.eventWaiters = new Map();
        this.ws.addEventListener("message", (event) => {
            const msg = JSON.parse(event.data);
            if (msg.method && this.eventWaiters.has(msg.method)) {
                const waiters = this.eventWaiters.get(msg.method);
                this.eventWaiters.delete(msg.method);
                waiters.forEach((resolve) => resolve(msg.params));
            }
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) reject(new Error(JSON.stringify(msg.error)));
                else resolve(msg.result);
            }
        });
        this.ready = new Promise((resolve, reject) => {
            this.ws.addEventListener("open", resolve);
            this.ws.addEventListener("error", reject);
        });
    }

    async send(method, params) {
        await this.ready;
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params: params || {} }));
        });
    }

    waitEvent(method) {
        return new Promise((resolve) => {
            const list = this.eventWaiters.get(method) || [];
            list.push(resolve);
            this.eventWaiters.set(method, list);
        });
    }

    async eval(expression) {
        const result = await this.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true
        });
        if (result.exceptionDetails) {
            throw new Error(JSON.stringify(result.exceptionDetails.exception || result.exceptionDetails));
        }
        return result.result.value;
    }

    async waitReady() {
        for (let i = 0; i < 40; i++) {
            try {
                const state = await this.eval("document.readyState === 'complete' && typeof renderHome === 'function'");
                if (state) return;
            } catch (err) {
                /* page may be mid-reload */
            }
            await sleep(250);
        }
        throw new Error("page did not become ready");
    }

    close() {
        this.ws.close();
    }
}

function launchChrome() {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), "galaxy-chrome-"));
    const child = spawn(CHROME, [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--proxy-server=direct://",
        "--proxy-bypass-list=*",
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${userData}`,
        "--window-size=1200,900",
        PAGE
    ], { stdio: "ignore" });
    return { child, userData };
}

async function waitForDebug() {
    for (let i = 0; i < 40; i++) {
        try {
            const list = await getJson("http://127.0.0.1:" + DEBUG_PORT + "/json/list");
            if (Array.isArray(list) && list.length) return list;
        } catch (err) {
            /* retry */
        }
        await sleep(250);
    }
    throw new Error("Chrome debug port did not open");
}

async function main() {
    const { child } = launchChrome();
    const report = [];
    try {
        const targets = await waitForDebug();
        const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl) || targets[0];
        const cdp = new Cdp(page.webSocketDebuggerUrl);
        await cdp.send("Runtime.enable");
        await cdp.send("Page.enable");
        await cdp.send("Browser.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: DOWNLOAD_DIR,
            eventsEnabled: true
        }).catch(() => cdp.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: DOWNLOAD_DIR
        }));

        const loaded = cdp.waitEvent("Page.loadEventFired");
        await cdp.send("Page.navigate", { url: PAGE });
        await Promise.race([loaded, sleep(8000)]);
        await cdp.waitReady();

        await cdp.eval("localStorage.clear(); location.reload()");
        await sleep(400);
        await cdp.waitReady();

        const home = await cdp.eval(`({
            easyLocked: document.querySelector('[data-level="easy"]').classList.contains("locked"),
            normalLocked: document.querySelector('[data-level="normal"]').classList.contains("locked"),
            hardLocked: document.querySelector('[data-level="hard"]').classList.contains("locked"),
            challengeLocked: document.getElementById("challengeCard").classList.contains("locked"),
            storageKey: STORAGE_KEY,
            clearsToWin: CLEARS_TO_WIN,
            starEasy: STAR_TIME.easy,
            starNormal: STAR_TIME.normal,
            starHard: STAR_TIME.hard,
            lang: lang,
            homeLang: document.getElementById("homeTitle").textContent
        })`);
        if (home.easyLocked) throw new Error("Easy should be open");
        if (!home.normalLocked || !home.hardLocked) throw new Error("Normal/Hard should start locked");
        if (!home.challengeLocked) throw new Error("Challenge should start locked");
        if (home.storageKey !== "galaxyGameDemo.progress.v1") throw new Error("wrong storage key");
        if (home.clearsToWin !== 20) throw new Error("wrong campaign constants");
        if (home.starEasy !== 60 || home.starNormal !== 90 || home.starHard !== 120) {
            throw new Error("star times should be 60/90/120 " + JSON.stringify(home));
        }
        if (home.lang !== "zh" || !home.homeLang.includes("星系")) throw new Error("default language should be Chinese");
        report.push("lock: Easy open, Normal/Hard/Challenge locked; stars 60/90/120; default zh");

        await cdp.eval("startCampaign('easy')");
        await sleep(400);
        const intro = await cdp.eval(`({
            brief: document.getElementById("briefOverlay").classList.contains("show"),
            clears: document.getElementById("briefClears").textContent,
            elapsed: document.getElementById("briefElapsed").textContent,
            stars: document.getElementById("briefStars").innerText,
            cols: COLS,
            rows: ROWS,
            cells: document.querySelectorAll("#board .cell").length,
            skipHidden: document.getElementById("skipTutorialRow").classList.contains("hidden"),
            tutorial: tutorialActive
        })`);
        if (!intro.brief) throw new Error("intro modal missing");
        if (!intro.clears.includes("0 / 20")) throw new Error("intro should show 0 / 20");
        if (!intro.stars.includes("通关本关") || !intro.stars.includes("60") || !intro.stars.includes("提示不超过 1")) {
            throw new Error("intro missing Easy star conditions " + intro.stars);
        }
        if (!intro.skipHidden) throw new Error("first run must not offer skip tutorial");
        if (!intro.tutorial) throw new Error("first Easy run should arm the tutorial");
        if (intro.cols !== 6 || intro.rows !== 4 || intro.cells !== 24) throw new Error("Easy board should be 6x4");
        report.push("enter Easy: intro modal, 0/20, 60s, no skip, 6x4 board");

        await cdp.eval("resumeFromBrief()");
        await sleep(200);

        const tutorialLock = await cdp.eval(`(async function () {
            const step0 = tutorialStep;
            await clickCell(3, 5);
            const blocked = selected;
            tutorialNext();
            const step1 = tutorialStep;
            const hintHidden = document.getElementById("hintBtn").classList.contains("hidden");
            return { step0: step0, blocked: blocked, step1: step1, hintHidden: hintHidden, off: document.querySelectorAll("#board .cell.tutorial-off").length };
        })()`);
        if (tutorialLock.step0 !== "class") throw new Error("tutorial should start on class step");
        if (tutorialLock.blocked) throw new Error("tutorial class step should ignore other tiles");
        if (tutorialLock.step1 !== "swap") throw new Error("Next should advance to swap");
        if (tutorialLock.hintHidden) throw new Error("hint button should be visible in campaign");
        if (tutorialLock.off < 1) throw new Error("non-taught tiles should be dimmed");
        report.push("tutorial: class step locks other tiles, Next goes to swap, hint button visible");

        const spawnLoop = await cdp.eval(`(function () {
            const stacks = [];
            for (let n = 0; n < 12; n++) {
                const face = activeCatalog.find(function (item) { return item.classId === "FaceOnSpirals"; });
                const other = activeCatalog.find(function (item) { return item.classId !== "FaceOnSpirals"; });
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        board[r][c] = cloneTile(c === 0 ? face : other);
                    }
                }
                board[0][2] = cloneTile(other);
                board[1][2] = cloneTile(face);
                board[2][2] = cloneTile(face);
                board[3][2] = cloneTile(face);
                board[1][2] = null;
                board[2][2] = null;
                board[3][2] = null;
                const g = planGravity();
                if (g.error) return { error: true, n: n };
                const ids = [board[0][2].classId, board[1][2].classId, board[2][2].classId];
                stacks.push(ids.join(","));
                if (ids[0] === ids[1] && ids[1] === ids[2]) {
                    return { fail: ids, n: n };
                }
            }
            return { ok: true, stacks: stacks };
        })()`);
        if (spawnLoop.error || spawnLoop.fail) {
            throw new Error("vertical refill same-class loop " + JSON.stringify(spawnLoop));
        }
        report.push("vertical clear: 12 refills did not drop three identical classes");

        const deadlock = await cdp.eval(`(function () {
            clearsDone = 4;
            elapsedSec = 9;
            score = 70;
            hintCharges = 2;
            hintUses = 0;
            let dead = false;
            for (let i = 0; i < 400; i++) {
                const used = new Set();
                board = [];
                for (let r = 0; r < ROWS; r++) board[r] = new Array(COLS);
                if (fillBoardAvoidingMatches(used) && findMatches().length === 0 && findValidSwaps().length === 0) {
                    dead = true;
                    break;
                }
            }
            if (!dead) {
                for (let i = 0; i < 400; i++) {
                    if (initBoard() && findMatches().length === 0 && findValidSwaps().length === 0) {
                        dead = true;
                        break;
                    }
                }
            }
            if (!dead) {
                const orig = findValidSwaps;
                let calls = 0;
                findValidSwaps = function () {
                    calls += 1;
                    if (calls === 1) return [];
                    return orig();
                };
                const beforeIds = board.map(function (row) {
                    return row.map(function (t) { return t && t.id; });
                });
                const did = ensurePlayableBoard(true);
                findValidSwaps = orig;
                const afterIds = board.map(function (row) {
                    return row.map(function (t) { return t && t.id; });
                });
                return {
                    dead: "forced-no-swap",
                    did: did,
                    swaps: findValidSwaps().length,
                    matches: findMatches().length,
                    msg: document.getElementById("message").textContent,
                    clears: clearsDone,
                    elapsed: elapsedSec,
                    score: score,
                    charges: hintCharges,
                    changed: JSON.stringify(beforeIds) !== JSON.stringify(afterIds)
                };
            }
            const beforeIds = board.map(function (row) {
                return row.map(function (t) { return t && t.id; });
            });
            const did = ensurePlayableBoard(true);
            const afterIds = board.map(function (row) {
                return row.map(function (t) { return t && t.id; });
            });
            return {
                dead: true,
                did: did,
                swaps: findValidSwaps().length,
                matches: findMatches().length,
                msg: document.getElementById("message").textContent,
                clears: clearsDone,
                elapsed: elapsedSec,
                score: score,
                charges: hintCharges,
                changed: JSON.stringify(beforeIds) !== JSON.stringify(afterIds)
            };
        })()`);
        if (!deadlock.did || deadlock.swaps < 1 || deadlock.matches) {
            throw new Error("dead board did not reshuffle into a playable board " + JSON.stringify(deadlock));
        }
        if (!deadlock.msg.includes("重新排列")) throw new Error("reshuffle notice missing");
        if (deadlock.clears !== 4 || deadlock.elapsed !== 9 || deadlock.score !== 70 || deadlock.charges !== 2) {
            throw new Error("reshuffle reset progress " + JSON.stringify(deadlock));
        }
        if (!deadlock.changed) throw new Error("reshuffle did not change the board");
        report.push("deadlock reshuffle: Easy 6x4 gained a swap, progress unchanged (" + deadlock.dead + ")");

        const noShuffle = await cdp.eval(`(function () {
            if (!findValidSwaps().length) reshuffleBoardPlanted();
            const before = JSON.stringify(board.map(function (row) {
                return row.map(function (t) { return t && t.id; });
            }));
            const did = ensurePlayableBoard(true);
            const after = JSON.stringify(board.map(function (row) {
                return row.map(function (t) { return t && t.id; });
            }));
            return { did: did, same: before === after, swaps: findValidSwaps().length };
        })()`);
        if (noShuffle.did || !noShuffle.same || noShuffle.swaps < 1) {
            throw new Error("playable board should not reshuffle " + JSON.stringify(noShuffle));
        }
        report.push("playable board is not reshuffled");

        const pauseKeep = await cdp.eval(`(function () {
            const before = board.map(function (row) { return row.map(function (t) { return t && t.id; }); });
            clearsDone = 5;
            elapsedSec = 7;
            document.getElementById("pauseBtn").click();
            return {
                brief: document.getElementById("briefOverlay").classList.contains("show"),
                title: document.getElementById("briefTitle").textContent,
                clears: document.getElementById("briefClears").textContent,
                elapsed: document.getElementById("briefElapsed").textContent,
                same: JSON.stringify(before) === JSON.stringify(board.map(function (row) {
                    return row.map(function (t) { return t && t.id; });
                })),
                footerReset: !!document.querySelector("#playArea button[onclick*=\\"restartCurrentRun\\"]"),
                pauseText: document.getElementById("pauseBtn").textContent,
                pauseTop: document.getElementById("pauseBtn").getBoundingClientRect().top,
                modalRestart: !!document.querySelector("#briefOverlay button[onclick*=\\"restartCurrentRun\\"]")
            };
        })()`);
        if (!pauseKeep.brief || pauseKeep.title !== "暂停") throw new Error("pause did not open progress modal");
        if (!pauseKeep.clears.includes("5 / 20") || !pauseKeep.elapsed.includes("7")) throw new Error("pause lost progress");
        if (!pauseKeep.same) throw new Error("pause reset the board");
        if (pauseKeep.footerReset) throw new Error("play footer still resets");
        if (pauseKeep.pauseText !== "暂停" || pauseKeep.pauseTop > 80) throw new Error("pause should sit at the top");
        if (!pauseKeep.modalRestart) throw new Error("modal should keep 重新开始");
        report.push("pause keeps board/progress; 暂停 is at the top; 重新开始 stays in the modal");

        await cdp.send("Emulation.setDeviceMetricsOverride", {
            width: 900,
            height: 500,
            deviceScaleFactor: 1,
            mobile: false
        });
        await cdp.eval("fitPlayLayout()");
        await sleep(200);
        const shortWin = await cdp.eval(`(function () {
            const r = document.getElementById("pauseBtn").getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, vh: window.innerHeight, text: document.getElementById("pauseBtn").textContent };
        })()`);
        if (shortWin.text !== "暂停" || shortWin.top < 0 || shortWin.bottom > shortWin.vh) {
            throw new Error("pause not visible in short window " + JSON.stringify(shortWin));
        }
        await cdp.send("Emulation.clearDeviceMetricsOverride");
        await cdp.eval("fitPlayLayout()");
        report.push("pause visible at the top on a 500px-tall window");

        await cdp.eval("resumeFromBrief(); elapsedSec = 61; pauseRun()");
        await sleep(200);
        const timeForfeit = await cdp.eval("document.getElementById('briefStars').innerText");
        if (!timeForfeit.includes("已失去") || !timeForfeit.includes("60")) throw new Error("time forfeit not shown for Easy 60s");
        report.push("forfeit star 2: elapsed > 60s shows 已失去");

        await cdp.eval("resumeFromBrief(); hintUses = 2; pauseRun()");
        await sleep(200);
        const hintForfeit = await cdp.eval("document.getElementById('briefStars').innerText");
        if (!hintForfeit.includes("提示不超过 1") || !hintForfeit.match(/已失去/g) || hintForfeit.match(/已失去/g).length < 2) {
            throw new Error("hint forfeit not shown together with time forfeit");
        }
        report.push("forfeit star 3: two hints show 已失去");

        await cdp.eval("resumeFromBrief(); finishCampaignWin()");
        await sleep(300);
        const win = await cdp.eval(`({
            winShow: document.getElementById("winOverlay").classList.contains("show"),
            stars: progress.stars.easy,
            best: progress.bestTime.easy,
            stored: JSON.parse(localStorage.getItem(STORAGE_KEY))
        })`);
        if (!win.winShow) throw new Error("win overlay missing");
        if (!win.stars[0] || win.stars[1] || win.stars[2]) throw new Error("expected only star 1 after both forfeits");
        if (win.best !== 91) throw new Error("best time should record 91s");
        const oneStarPaint = await cdp.eval(`([...document.querySelectorAll("#winStars span")].map(function (s) {
            return { on: s.classList.contains("on"), color: getComputedStyle(s).color };
        }))`);
        if (oneStarPaint.length !== 3 || !oneStarPaint[0].on || oneStarPaint[1].on || oneStarPaint[2].on) {
            throw new Error("1-star result markup wrong " + JSON.stringify(oneStarPaint));
        }
        if (oneStarPaint[0].color === oneStarPaint[1].color) throw new Error("1-star result uses the same color for empty stars");
        report.push("20-clear path: win overlay, only star 1 kept, best time stored");

        await cdp.eval("goHome(); startCampaign('easy'); elapsedSec = 12; hintUses = 2; finishCampaignWin()");
        await sleep(200);
        const twoStarPaint = await cdp.eval(`([...document.querySelectorAll("#winStars span")].map(function (s) {
            return { on: s.classList.contains("on"), color: getComputedStyle(s).color };
        }))`);
        if (!twoStarPaint[0].on || !twoStarPaint[1].on || twoStarPaint[2].on) throw new Error("2-star result markup wrong");
        if (twoStarPaint[0].color === twoStarPaint[2].color) throw new Error("2-star empty star is not dim");
        await cdp.eval("goHome(); startCampaign('easy'); elapsedSec = 12; hintUses = 1; finishCampaignWin()");
        await sleep(200);
        const threeStarPaint = await cdp.eval(`([...document.querySelectorAll("#winStars span")].map(function (s) {
            return { on: s.classList.contains("on"), color: getComputedStyle(s).color };
        }))`);
        if (!threeStarPaint.every(function (s) { return s.on; })) throw new Error("3-star result should fill all stars");
        if (threeStarPaint[0].color !== twoStarPaint[0].color) throw new Error("filled stars should match across results");
        if (twoStarPaint.filter(function (s) { return s.on; }).length === threeStarPaint.filter(function (s) { return s.on; }).length) {
            throw new Error("2-star and 3-star look the same");
        }
        report.push("results: 1-star and 2-star paint differ from 3-star; star 3 kept with exactly 1 hint");

        await cdp.eval("goHome(); startCampaign('easy')");
        await sleep(250);
        const skipDefault = await cdp.eval(`({
            hidden: document.getElementById("skipTutorialRow").classList.contains("hidden"),
            checked: document.getElementById("skipTutorial").checked,
            done: progress.tutorialDone
        })`);
        if (skipDefault.hidden || !skipDefault.checked || !skipDefault.done) {
            throw new Error("after first completion skip should show and be checked " + JSON.stringify(skipDefault));
        }
        report.push("Easy skip tutorial: shown and checked by default after first completion");

        await cdp.eval("goHome()");
        await sleep(200);
        const afterWin = await cdp.eval(`({
            easyStars: document.querySelector('[data-level="easy"] .stars .on') ? document.querySelectorAll('[data-level="easy"] .stars .on').length : 0,
            normalLocked: document.querySelector('[data-level="normal"]').classList.contains("locked"),
            hardLocked: document.querySelector('[data-level="hard"]').classList.contains("locked"),
            challengeLocked: document.getElementById("challengeCard").classList.contains("locked")
        })`);
        if (afterWin.easyStars < 1) throw new Error("Easy card should show a star");
        if (afterWin.normalLocked) throw new Error("Normal should unlock after Easy has a star");
        if (!afterWin.hardLocked) throw new Error("Hard should stay locked");
        if (!afterWin.challengeLocked) throw new Error("Challenge still locked before 9 stars");
        report.push("after 1 star: Normal open, Hard/Challenge locked");

        await cdp.eval("startCampaign('normal')");
        await sleep(400);
        const normalBoard = await cdp.eval("({cols:COLS, rows:ROWS, cells:document.querySelectorAll('#board .cell').length, brief:document.getElementById('briefOverlay').classList.contains('show'), stars:document.getElementById('briefStars').innerText})");
        if (normalBoard.cols !== 6 || normalBoard.rows !== 4 || normalBoard.cells !== 24) throw new Error("Normal board should be 6x4");
        if (!normalBoard.stars.includes("90")) throw new Error("Normal enter copy should show 90s");
        await cdp.eval("elapsedSec = 12; hintUses = 0; finishCampaignWin(); goHome()");
        await sleep(250);
        const hardGate = await cdp.eval("({hardLocked:document.querySelector('[data-level=\"hard\"]').classList.contains('locked'), normalStars:progress.stars.normal})");
        if (hardGate.hardLocked) throw new Error("Hard should unlock after Normal has a star");
        await cdp.eval("startCampaign('hard')");
        await sleep(400);
        const hardBoard = await cdp.eval("({cols:COLS, rows:ROWS, cells:document.querySelectorAll('#board .cell').length, stars:document.getElementById('briefStars').innerText})");
        if (hardBoard.cols !== 8 || hardBoard.rows !== 4 || hardBoard.cells !== 32) throw new Error("Hard board should be 8x4");
        if (!hardBoard.stars.includes("120")) throw new Error("Hard enter copy should show 120s");
        await cdp.eval("goHome()");
        report.push("Normal 6x4 / 90s unlocks Hard; Hard is 8x4 / 120s");

        await cdp.eval(`progress.stars = {easy:[true,true,true],normal:[true,true,true],hard:[true,true,true]}; saveProgress(); renderHome()`);
        await sleep(150);
        const nine = await cdp.eval("challengeUnlocked() && !document.getElementById('challengeCard').classList.contains('locked')");
        if (!nine) throw new Error("9 stars should unlock Challenge");
        report.push("9-star gate: Challenge unlocks");

        await cdp.eval("location.reload()");
        await sleep(400);
        await cdp.waitReady();
        const reloaded = await cdp.eval(`({
            easy: progress.stars.easy,
            challenge: challengeUnlocked(),
            key: localStorage.getItem(STORAGE_KEY) && JSON.parse(localStorage.getItem(STORAGE_KEY)).stars.hard
        })`);
        if (!reloaded.easy.every(Boolean) || !reloaded.challenge) throw new Error("reload lost 9-star progress");
        report.push("reload keeps stars and challenge unlock");

        await cdp.eval("resetAllProgress()");
        await sleep(150);
        const reset = await cdp.eval(`({
            stars: totalStars(),
            challenge: challengeUnlocked(),
            normal: document.querySelector('[data-level="normal"]').classList.contains("locked")
        })`);
        if (reset.stars !== 0 || reset.challenge || !reset.normal) throw new Error("reset did not clear progress");
        report.push("console reset: all progress cleared");

        await cdp.eval("unlockChallengeNow()");
        await sleep(150);
        const unlocked = await cdp.eval("challengeUnlocked() && !document.getElementById('challengeCard').classList.contains('locked') && totalStars() === 0");
        if (!unlocked) throw new Error("console unlock should open Challenge without stars");
        report.push("console unlock: Challenge open with 0 stars");

        await cdp.eval("startChallenge()");
        await sleep(500);
        const ch = await cdp.eval(`({
            cols: COLS,
            rows: ROWS,
            folder: activeCatalog.length,
            mode,
            timeLeft,
            brief: document.getElementById("briefOverlay").classList.contains("show"),
            lead: document.getElementById("briefLead").textContent
        })`);
        if (ch.cols !== 8 || ch.rows !== 4) throw new Error("Challenge board should be 8x4");
        if (ch.mode !== "challenge") throw new Error("not in challenge mode");
        if (ch.folder !== 105) throw new Error("Challenge catalog should be 105 images, got " + ch.folder);
        if (!ch.brief) throw new Error("Challenge should open with a start modal");
        if (!ch.lead.includes("3") || !ch.lead.includes("10") || !ch.lead.includes("+")) {
            throw new Error("Challenge start modal should explain score, +3s, and 10s hint refill: " + ch.lead);
        }
        report.push("Challenge: 8x4 board, Challange catalog 105 images, start modal");

        await cdp.eval("resumeFromBrief()");
        await sleep(200);
        const hintStart = await cdp.eval(`({
            charges: hintCharges,
            label: document.getElementById("hintBtn").textContent,
            hidden: document.getElementById("hintBtn").classList.contains("hidden")
        })`);
        if (hintStart.hidden || hintStart.charges !== 3 || !hintStart.label.includes("3")) {
            throw new Error("challenge should start with 3 visible hint charges");
        }
        await cdp.eval("failSwaps = 9;");
        await sleep(150);
        const noAuto = await cdp.eval("document.querySelectorAll('#board .cell.hint').length");
        if (noAuto) throw new Error("no mode may auto-hint after missed swaps");
        await cdp.eval("useHint()");
        await sleep(150);
        const spent = await cdp.eval(`({
            charges: hintCharges,
            hints: document.querySelectorAll("#board .cell.hint").length,
            label: document.getElementById("hintBtn").textContent,
            uses: hintUses
        })`);
        if (spent.charges !== 2 || spent.hints < 2 || !spent.label.includes("2") || spent.uses !== 1) {
            throw new Error("hint button should spend one charge " + JSON.stringify(spent));
        }
        const cap = await cdp.eval(`(function () {
            hintCharges = 3;
            hintRefillSec = 0;
            for (let i = 0; i < 15; i++) tickHintRefill();
            const atCap = { charges: hintCharges, refill: hintRefillSec };
            hintCharges = 2;
            hintRefillSec = 0;
            for (let i = 0; i < 9; i++) tickHintRefill();
            const nine = { charges: hintCharges, refill: hintRefillSec };
            tickHintRefill();
            return { atCap: atCap, nine: nine, ten: { charges: hintCharges, refill: hintRefillSec } };
        })()`);
        if (cap.atCap.charges !== 3 || cap.atCap.refill !== 0) throw new Error("ticks at cap must not refill");
        if (cap.nine.charges !== 2 || cap.nine.refill !== 9) throw new Error("9s below cap should not grant yet");
        if (cap.ten.charges !== 3 || cap.ten.refill !== 0) throw new Error("10s below cap should grant +1");
        report.push("hints: manual only, 3 start, +1 every 10s, cap 3");

        await cdp.eval("score = 42; elapsedSec = 17; endChallenge()");
        await sleep(200);
        const over = await cdp.eval(`({
            show: document.getElementById("challengeOverlay").classList.contains("show"),
            score: document.getElementById("finalScore").textContent,
            duration: document.getElementById("finalDuration").textContent
        })`);
        if (!over.show || over.score !== "42" || !over.duration.includes("17")) {
            throw new Error("challenge result modal mismatch " + JSON.stringify(over));
        }

        await cdp.eval("saveChallengePng()");
        let png = null;
        for (let i = 0; i < 20; i++) {
            await sleep(250);
            const files = fs.readdirSync(DOWNLOAD_DIR).filter((name) => name.endsWith(".png"));
            if (files.length) {
                png = path.join(DOWNLOAD_DIR, files[0]);
                break;
            }
        }
        if (!png) {
            const blobCheck = await cdp.eval(`new Promise(function (resolve) {
                const canvas = document.createElement("canvas");
                canvas.width = 10; canvas.height = 10;
                canvas.toBlob(function (blob) { resolve(!!blob && blob.type === "image/png" && blob.size > 0); }, "image/png");
            })`);
            if (!blobCheck) throw new Error("canvas PNG blob failed");
            report.push("challenge PNG: in-page canvas blob works (headless download path empty)");
        } else {
            const size = fs.statSync(png).size;
            if (size < 1000) throw new Error("PNG too small: " + size);
            report.push("challenge PNG downloaded (" + size + " bytes): " + path.basename(png));
        }

        await cdp.eval("goHome(); location.reload()");
        await sleep(400);
        await cdp.waitReady();
        const persistUnlock = await cdp.eval("progress.challengeUnlocked && challengeUnlocked()");
        if (!persistUnlock) throw new Error("reload lost console challenge unlock");
        report.push("reload keeps console challenge unlock");

        await cdp.eval("resetAllProgress()");
        await cdp.eval("startCampaign('easy'); resumeFromBrief()");
        await sleep(200);
        await cdp.eval("completeTutorial()");
        const afterTutor = await cdp.eval("({done: progress.tutorialDone, step: tutorialStep, active: tutorialActive})");
        if (!afterTutor.done || afterTutor.active) throw new Error("completeTutorial should unlock and persist");
        report.push("tutorial unlock persists in localStorage");

        await cdp.eval("goHome(); startCampaign('easy'); resumeFromBrief()");
        await sleep(200);
        await cdp.eval("failSwaps = 9;");
        const campaignNoAuto = await cdp.eval("document.querySelectorAll('#board .cell.hint').length");
        if (campaignNoAuto) throw new Error("campaign must not auto-hint");
        report.push("campaign does not auto-hint after misses");

        await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
        await sleep(150);
        const escPause = await cdp.eval(`({
            brief: document.getElementById("briefOverlay").classList.contains("show"),
            title: document.getElementById("briefTitle").textContent
        })`);
        if (!escPause.brief || escPause.title !== "暂停") throw new Error("Esc should pause");
        report.push("Esc pauses the run");

        await cdp.eval("resumeFromBrief()");
        await sleep(150);
        await cdp.eval("dismissHint(); hintPair = null; hintCharges = 3;");
        await cdp.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }))`);
        await sleep(150);
        const hHint = await cdp.eval(`({
            charges: hintCharges,
            uses: hintUses,
            hints: document.querySelectorAll("#board .cell.hint").length
        })`);
        if (hHint.charges !== 2 || hHint.uses < 1 || hHint.hints < 2) {
            throw new Error("H should spend a hint charge " + JSON.stringify(hHint));
        }
        report.push("H spends a hint charge");

        await cdp.eval("goHome(); toggleLang()");
        await sleep(100);
        const enHome = await cdp.eval(`({
            lang: lang,
            title: document.getElementById("homeTitle").textContent,
            stored: JSON.parse(localStorage.getItem(STORAGE_KEY)).lang
        })`);
        if (enHome.lang !== "en" || !enHome.title.toLowerCase().includes("galaxy") || enHome.stored !== "en") {
            throw new Error("language toggle did not switch to English " + JSON.stringify(enHome));
        }
        await cdp.eval("location.reload()");
        await sleep(400);
        await cdp.waitReady();
        const enReload = await cdp.eval(`({
            lang: lang,
            title: document.getElementById("homeTitle").textContent
        })`);
        if (enReload.lang !== "en" || !enReload.title.toLowerCase().includes("galaxy")) {
            throw new Error("language did not persist across reload");
        }
        report.push("language toggle persists across reload");

        cdp.close();
        console.log("ok: browser checks");
        report.forEach((line) => console.log("- " + line));
        console.log("download dir", DOWNLOAD_DIR);
    } finally {
        child.kill("SIGTERM");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
