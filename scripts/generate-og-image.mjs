import { chromium } from "@playwright/test";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const SOURCE_URL = process.env.OG_SOURCE_URL ?? "http://127.0.0.1:5173/puzzle/4";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const OG_VIEWPORT = { width: 1200, height: 630 };

const MOBILE_SOURCE_PATH = resolve(ROOT_DIR, "public/.og-mobile-source.png");
const OG_OUTPUT_PATH = resolve(ROOT_DIR, "public/og-image.png");
const DARK_SETTINGS = JSON.stringify({ overallTheme: "dark" });

async function captureDarkMobileSource(browser) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    colorScheme: "dark",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await context.addInitScript(({ settings }) => {
    localStorage.setItem("zugzwang.theme", "dark");
    localStorage.setItem("zugzwang-settings", settings);
  }, { settings: DARK_SETTINGS });

  const page = await context.newPage();
  await page.goto(SOURCE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ui-app-shell", { timeout: 15000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: MOBILE_SOURCE_PATH, type: "png" });
  await context.close();
}

function buildTemplate(sourceDataUrl) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; height: 100%; }
      body {
        background:
          radial-gradient(circle at 20% 20%, #27303f 0%, #11151d 44%, #090b10 100%);
        color: #f2f4f8;
        font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card {
        width: 1200px;
        height: 630px;
        display: grid;
        grid-template-columns: 1fr 350px;
        align-items: center;
        padding: 44px 64px;
        gap: 40px;
      }
      .copy {
        display: grid;
        gap: 14px;
        align-content: center;
        max-width: 680px;
      }
      .eyebrow {
        font-size: 24px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #9ab0ce;
      }
      .title {
        font-size: 88px;
        line-height: 0.95;
        letter-spacing: -0.03em;
        margin: 0;
      }
      .subtitle {
        font-size: 42px;
        line-height: 1.05;
        margin: 0;
        color: #c7d4ea;
      }
      .meta {
        margin-top: 16px;
        font-size: 30px;
        color: #f0bb70;
      }
      .phone-wrap {
        width: 278px;
        height: 602px;
        justify-self: center;
        border-radius: 42px;
        padding: 10px;
        background: linear-gradient(155deg, #5a6f90, #232a36 58%, #11151d);
        box-shadow: 0 32px 70px rgba(0, 0, 0, 0.5);
      }
      .phone-screen {
        width: 100%;
        height: 100%;
        border-radius: 34px;
        overflow: hidden;
        background: #0f141d;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .phone-screen img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="copy">
        <div class="eyebrow">zugzwang.me</div>
        <h1 class="title">Zugzwang</h1>
        <p class="subtitle">Chess Puzzle Trainer</p>
        <p class="meta">4,462 Polgar mate puzzles</p>
      </div>
      <div class="phone-wrap">
        <div class="phone-screen">
          <img src="${sourceDataUrl}" alt="" />
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function composeOgImage(browser) {
  const sourceBuffer = await readFile(MOBILE_SOURCE_PATH);
  const sourceDataUrl = `data:image/png;base64,${sourceBuffer.toString("base64")}`;

  const context = await browser.newContext({
    viewport: OG_VIEWPORT,
    colorScheme: "dark",
  });

  const page = await context.newPage();
  await page.setContent(buildTemplate(sourceDataUrl), { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: OG_OUTPUT_PATH, type: "png" });
  await context.close();
}

async function main() {
  const browser = await chromium.launch();
  try {
    console.log(`Capturing dark mobile source from ${SOURCE_URL}...`);
    await captureDarkMobileSource(browser);
    console.log("Composing 1200x630 OG image...");
    await composeOgImage(browser);
    console.log(`Saved ${OG_OUTPUT_PATH}`);
  } finally {
    await browser.close();
    await rm(MOBILE_SOURCE_PATH, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
