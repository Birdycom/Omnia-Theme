// File: scripts/icon.mjs
// Renders media/icon.svg (code lines in the theme's syntax colors) to the 256 px icon.png the Marketplace shows.
// Map: media/icon.svg -> headless Chrome or Edge -> icon.png
// Author: Serge Cools | Theme: Omnia Theme

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(root, "media", "icon.svg"), "utf8").replace("<svg ", '<svg width="256" height="256" ');
const browser = await chromium.launch({ channel: process.env.OMNIA_BROWSER || "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
await page.setContent(`<!doctype html><style>*{margin:0}svg{display:block}</style>${svg}`);
await page.screenshot({ path: path.join(root, "media", "icon.png"), omitBackground: true });
await browser.close();
console.log("[icon] media/icon.png");
