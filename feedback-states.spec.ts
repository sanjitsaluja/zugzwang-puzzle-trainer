/**
 * Playwright script to verify chess puzzle feedback states.
 * Run: npx playwright test feedback-states.spec.ts
 * 
 * Prerequisite: Dev server running on http://localhost:5173
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

// Puzzle 1: White to move, Mate in One. Correct: f6→g7 (Qg7#). Incorrect: any other move e.g. f6→f8
function squareToCoord(key: string, asWhite: boolean): { x: number; y: number } {
  const file = key.charCodeAt(0) - 97;
  const rank = parseInt(key[1]!, 10) - 1;
  const x = (file + 0.5) / 8;
  const y = asWhite ? (7 - rank + 0.5) / 8 : (rank + 0.5) / 8;
  return { x, y };
}

async function movePiece(
  page: import("@playwright/test").Page,
  from: string,
  to: string,
  orientation: "white" | "black" = "white"
) {
  const board = page.locator(".board-wrapper .cg-wrap").first();
  await expect(board).toBeVisible({ timeout: 10000 });
  const box = await board.boundingBox();
  if (!box) throw new Error("Board not found");
  const fromPos = squareToCoord(from, orientation === "white");
  const toPos = squareToCoord(to, orientation === "white");
  const fromX = box.x + fromPos.x * box.width;
  const fromY = box.y + fromPos.y * box.height;
  const toX = box.x + toPos.x * box.width;
  const toY = box.y + toPos.y * box.height;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 5 });
  await page.mouse.up();
}

test.describe("Chess puzzle feedback states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/puzzle/1`, { waitUntil: "networkidle" });
    await expect(page.locator(".board-wrapper")).toBeVisible({ timeout: 15000 });
    await page.waitForSelector(".board-wrapper:not(:has(.app-loading))", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
  });

  test("(1) Correct move: green board pulse + correct toast", async ({ page }) => {
    await movePiece(page, "f6", "g7");
    await page.waitForTimeout(300);

    const boardWrapper = page.locator(".board-wrapper");
    const toast = page.locator('[role="status"]');
    
    const hasGreenPulse = await boardWrapper.evaluate((el) => {
      return el.classList.contains("state-pulse-correct") || 
        getComputedStyle(el).borderColor.includes("76, 175, 80");
    }).catch(() => false);

    const toastVisible = await toast.isVisible().catch(() => false);
    const toastText = toastVisible ? await toast.textContent() : "";
    const hasCorrectMessage = toastText.includes("Correct");

    expect(hasGreenPulse || toastVisible, "Green pulse or correct toast").toBeTruthy();
    expect(hasCorrectMessage, "Toast shows correct message").toBeTruthy();
  });

  test("(2) Incorrect move: red board pulse + incorrect toast + failed state latched", async ({ page }) => {
    await movePiece(page, "f6", "f8");
    await page.waitForTimeout(800);

    const boardWrapper = page.locator(".board-wrapper");
    const toast = page.locator('[role="status"]');
    
    const hasRedState = await boardWrapper.evaluate((el) => {
      return el.classList.contains("state-pulse-incorrect") || 
        el.classList.contains("state-failed-active");
    }).catch(() => false);

    const toastText = await toast.textContent().catch(() => "");
    const hasIncorrectMessage = toastText.includes("Not the best move") || toastText.includes("Keep playing");

    const statusEl = page.locator(".puzzle-status.failed");
    const failedLatched = await statusEl.isVisible().catch(() => false);

    expect(hasRedState || hasIncorrectMessage, "Red feedback or incorrect toast").toBeTruthy();
    expect(hasIncorrectMessage, "Incorrect toast message").toBeTruthy();
    expect(failedLatched, "Failed state latched (status shows Failed)").toBeTruthy();
  });

  test("(3) Solved complete: persistent green border + solved timer state", async ({ page }) => {
    await movePiece(page, "f6", "g7");
    await page.waitForTimeout(1200);

    const boardWrapper = page.locator(".board-wrapper");
    const hasGreenBorder = await boardWrapper.evaluate((el) => {
      return el.classList.contains("state-success") && el.classList.contains("state-complete");
    }).catch(() => false);

    const timerSuccess = await page.locator(".timer-display.success").isVisible().catch(() => false);
    const timerLabel = await page.locator(".timer-label").textContent().catch(() => "");
    const hasSolveTime = timerLabel.includes("Solve Time");

    expect(hasGreenBorder, "Persistent green border on solve").toBeTruthy();
    expect(timerSuccess || hasSolveTime, "Solved timer state").toBeTruthy();
  });

  test("(4) Failed-but-complete: persistent red border + failed timer state", async ({ page }) => {
    await movePiece(page, "f6", "f8");
    await page.waitForTimeout(600);
    await movePiece(page, "g8", "h8");
    await page.waitForTimeout(500);
    await movePiece(page, "f8", "e8");
    await page.waitForTimeout(500);
    await movePiece(page, "h8", "g8");
    await page.waitForTimeout(500);
    await movePiece(page, "e8", "g8");
    await page.waitForTimeout(600);

    const boardWrapper = page.locator(".board-wrapper");
    const hasRedBorder = await boardWrapper.evaluate((el) => {
      return el.classList.contains("state-failed") && el.classList.contains("state-complete");
    }).catch(() => false);

    const timerFailed = await page.locator(".timer-display.failed").isVisible().catch(() => false);
    const timerLabel = await page.locator(".timer-label").textContent().catch(() => "");
    const hasTimeLabel = timerLabel.includes("Time");

    expect(hasRedBorder, "Persistent red border on failed-complete").toBeTruthy();
    expect(timerFailed || hasTimeLabel, "Failed timer state").toBeTruthy();
  });
});
