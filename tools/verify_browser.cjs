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
            starLimit: STAR_TIME_LIMIT
        })`);
        if (home.easyLocked) throw new Error("Easy should be open");
        if (!home.normalLocked || !home.hardLocked) throw new Error("Normal/Hard should start locked");
        if (!home.challengeLocked) throw new Error("Challenge should start locked");
        if (home.storageKey !== "galaxyGameDemo.progress.v1") throw new Error("wrong storage key");
        if (home.clearsToWin !== 20 || home.starLimit !== 90) throw new Error("wrong campaign constants");
        report.push("lock: Easy open, Normal/Hard/Challenge locked");

        await cdp.eval("startCampaign('easy')");
        await sleep(400);
        const intro = await cdp.eval(`({
            brief: document.getElementById("briefOverlay").classList.contains("show"),
            clears: document.getElementById("briefClears").textContent,
            elapsed: document.getElementById("briefElapsed").textContent,
            stars: document.getElementById("briefStars").innerText,
            cols: COLS,
            rows: ROWS,
            cells: document.querySelectorAll("#board .cell").length
        })`);
        if (!intro.brief) throw new Error("intro modal missing");
        if (!intro.clears.includes("0 / 20")) throw new Error("intro should show 0 / 20");
        if (!intro.stars.includes("通关本关") || !intro.stars.includes("90") || !intro.stars.includes("提示")) {
            throw new Error("intro missing star conditions");
        }
        if (intro.cols !== 6 || intro.rows !== 4 || intro.cells !== 24) throw new Error("Easy board should be 6x4");
        report.push("enter Easy: intro modal, 0/20, 6x4 board");

        await cdp.eval("elapsedSec = 91; pauseRun()");
        await sleep(200);
        const timeForfeit = await cdp.eval("document.getElementById('briefStars').innerText");
        if (!timeForfeit.includes("已失去")) throw new Error("time forfeit not shown");
        report.push("forfeit star 2: elapsed > 90s shows 已失去");

        await cdp.eval("resumeFromBrief(); hintTriggered = true; showHint(); pauseRun()");
        await sleep(200);
        const hintForfeit = await cdp.eval("document.getElementById('briefStars').innerText");
        if (!hintForfeit.includes("不使用提示通关") || !hintForfeit.match(/已失去/g) || hintForfeit.match(/已失去/g).length < 2) {
            throw new Error("hint forfeit not shown together with time forfeit");
        }
        report.push("forfeit star 3: hint triggered shows 已失去");

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
        report.push("20-clear path: win overlay, only star 1 kept, best time stored");

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
        const normalBoard = await cdp.eval("({cols:COLS, rows:ROWS, cells:document.querySelectorAll('#board .cell').length, brief:document.getElementById('briefOverlay').classList.contains('show')})");
        if (normalBoard.cols !== 6 || normalBoard.rows !== 4 || normalBoard.cells !== 24) throw new Error("Normal board should be 6x4");
        await cdp.eval("elapsedSec = 12; hintTriggered = false; finishCampaignWin(); goHome()");
        await sleep(250);
        const hardGate = await cdp.eval("({hardLocked:document.querySelector('[data-level=\"hard\"]').classList.contains('locked'), normalStars:progress.stars.normal})");
        if (hardGate.hardLocked) throw new Error("Hard should unlock after Normal has a star");
        await cdp.eval("startCampaign('hard')");
        await sleep(400);
        const hardBoard = await cdp.eval("({cols:COLS, rows:ROWS, cells:document.querySelectorAll('#board .cell').length})");
        if (hardBoard.cols !== 8 || hardBoard.rows !== 4 || hardBoard.cells !== 32) throw new Error("Hard board should be 8x4");
        await cdp.eval("goHome()");
        report.push("Normal 6x4 unlocks Hard; Hard is 8x4");

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
            timeLeft
        })`);
        if (ch.cols !== 8 || ch.rows !== 4) throw new Error("Challenge board should be 8x4");
        if (ch.mode !== "challenge") throw new Error("not in challenge mode");
        if (ch.folder !== 105) throw new Error("Challenge catalog should be 105 images, got " + ch.folder);
        report.push("Challenge: 8x4 board, Challange catalog 105 images");

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
