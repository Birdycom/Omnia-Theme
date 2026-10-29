// File: scripts/screenshots.mjs
// Takes the README screenshots in the real VS Code with this theme loaded (Extension Development Host).
// VS Code runs with a throw-away profile; Playwright drives it over the Chromium debug port.
// Map: temp profile + samples/ -> launch Code (1280x760, 2x) -> open each sample -> screenshots/*.png
// Author: Serge Cools | Theme: Omnia Theme
//
// VS Code path: $VSCODE_PATH, else the default user/system install. Run via `npm run screenshots`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "screenshots");
const samples = path.join(root, "samples");
const PORT = 9334;
const W = 1280, H = 760;
// File opened -> screenshot name.
const SHOTS = [["pricing.html", "html"], ["plans.blade.php", "blade"], ["theme.css", "css"], ["Plan.php", "php"], ["plans.js", "js"]];

function codePath() {
  if (process.env.VSCODE_PATH) return process.env.VSCODE_PATH;
  const candidates = {
    win32: [path.join(process.env.LOCALAPPDATA || "", "Programs/Microsoft VS Code/Code.exe"), "C:/Program Files/Microsoft VS Code/Code.exe"],
    darwin: ["/Applications/Visual Studio Code.app/Contents/MacOS/Electron"],
    linux: ["/usr/share/code/code", "/usr/bin/code"],
  }[process.platform] || [];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error("VS Code not found; set VSCODE_PATH");
  return hit;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "omnia-theme-"));
const userDir = path.join(tmp, "user");
// A copy outside the repo, so VS Code does not offer to open the parent git repository.
const work = path.join(tmp, "samples");
fs.mkdirSync(path.join(userDir, "User"), { recursive: true });
fs.cpSync(samples, work, { recursive: true });
fs.writeFileSync(path.join(userDir, "User", "settings.json"), JSON.stringify({
  "workbench.colorTheme": "Omnia Theme Main",
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "workbench.layoutControl.enabled": false,
  "window.commandCenter": false,
  "window.zoomLevel": 0,
  "editor.fontSize": 14,
  "editor.lineHeight": 22,
  "editor.minimap.enabled": false,
  "editor.cursorBlinking": "solid",
  "breadcrumbs.enabled": false,
  "security.workspace.trust.enabled": false,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "extensions.ignoreRecommendations": true,
  "chat.disableAIFeatures": true,
  "files.associations": { "*.blade.php": "php" },
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "git.enabled": false,
  "php.validate.enable": false,
  "php.suggest.basic": false,
}));

const code = spawn(codePath(), [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`, `--extensions-dir=${path.join(tmp, "ext")}`,
  `--extensionDevelopmentPath=${root}`, "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes", "--new-window", work,
], {
  stdio: "ignore",
  // Started from a VS Code terminal these would hand the window to the running VS Code instead.
  env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(ELECTRON_RUN_AS_NODE|VSCODE_)/.test(k))),
});

let browser;
for (let i = 0; i < 60 && !browser; i++) {
  await new Promise((r) => setTimeout(r, 500));
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null);
}
if (!browser) throw new Error("Could not connect to VS Code");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().includes("workbench")) || ctx.pages()[0];
await page.waitForSelector(".part.sidebar", { timeout: 30000 });
const visible = (sel) => page.evaluate((sel) => (document.querySelector(sel)?.offsetWidth || 0) > 0, sel);
if (await visible(".part.auxiliarybar")) await page.keyboard.press("Control+Alt+B");
const resize = () => page.evaluate(([w, h]) => window.resizeTo(w + outerWidth - innerWidth, h + outerHeight - innerHeight), [W, H]);
await resize();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 0, height: 0, deviceScaleFactor: 2, mobile: false });
await page.waitForTimeout(2500);

fs.mkdirSync(out, { recursive: true });
for (const [file, name] of SHOTS) {
  // Quick Open: type the file name, Enter.
  await page.keyboard.press("Control+P");
  await page.waitForTimeout(400);
  await page.keyboard.type(file, { delay: 20 });
  await page.waitForTimeout(600);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1800);
  // Cursor in the middle of the file so the current line highlight shows.
  await page.keyboard.press("Control+G");
  await page.keyboard.type("6");
  await page.keyboard.press("Enter");
  // No notification toasts in the picture.
  await page.keyboard.press("Control+Shift+P");
  await page.keyboard.type("Notifications: Clear All Notifications", { delay: 5 });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await resize();
  await page.waitForTimeout(800);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(data, "base64"));
  console.log("[screenshots]", `screenshots/${name}.png`);
}

// The workbench around the editor: back to the HTML file, the terminal panel open and the Command Palette showing.
await page.keyboard.press("Control+P");
await page.keyboard.type("pricing.html", { delay: 20 });
await page.waitForTimeout(600);
await page.keyboard.press("Enter");
await page.keyboard.press("Control+`");
await page.waitForTimeout(2500);
await page.keyboard.type("git status", { delay: 20 });
await page.keyboard.press("Control+Shift+P");
await page.waitForTimeout(400);
await page.keyboard.type("theme", { delay: 30 });
await page.waitForTimeout(1200);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(out, "workbench.png"), Buffer.from(data, "base64"));
console.log("[screenshots]", "screenshots/workbench.png");

await browser.close().catch(() => {});
code.kill();
