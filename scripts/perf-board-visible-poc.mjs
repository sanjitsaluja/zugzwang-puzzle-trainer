#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";

const RUNS = Number.parseInt(process.env.RUNS ?? "9", 10);
const TARGET_URL = process.env.URL ?? "http://127.0.0.1:4173/puzzle/1";
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.resolve("artifacts/perf");
const FILMSTRIP_RUN = Number.parseInt(process.env.FILMSTRIP_RUN ?? "1", 10);
const FILMSTRIP_INTERVAL_MS = Number.parseInt(process.env.FILMSTRIP_INTERVAL_MS ?? "300", 10);
const FILMSTRIP_EXTRA_MS = Number.parseInt(process.env.FILMSTRIP_EXTRA_MS ?? "1200", 10);
const MAX_RUN_MS = Number.parseInt(process.env.MAX_RUN_MS ?? "70000", 10);
const MAX_ENGINE_WAIT_MS = Number.parseInt(process.env.MAX_ENGINE_WAIT_MS ?? "65000", 10);

const SLOW_4G = {
  latencyMs: 750,
  downloadThroughputBytesPerSec: Math.round((1.6 * 1024 * 1024) / 8),
  uploadThroughputBytesPerSec: Math.round((0.75 * 1024 * 1024) / 8),
};

function assertPositiveInt(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }
}

function toTimestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function ms(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${value.toFixed(2)} ms`;
}

function shortUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value;
  }
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  const lowerValue = sortedValues[lower];
  const upperValue = sortedValues[upper];
  if (upper === lower) return lowerValue;
  return lowerValue + (upperValue - lowerValue) * weight;
}

function summarize(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance =
    sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length;
  const stddev = Math.sqrt(variance);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    mean,
    stddev,
  };
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (!raw.includes(",") && !raw.includes("\"") && !raw.includes("\n")) return raw;
  return `"${raw.replaceAll("\"", "\"\"")}"`;
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

async function captureRun(runIndex, runRootDir, captureArtifacts) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const state = {
      boardVisibleMs: null,
      lcpMs: null,
      fcpMs: null,
      engineReadyMs: null,
    };

    window.__perfCapture = state;

    const boardSelector = ".ui-board-root";
    const isBoardVisible = () => {
      const board = document.querySelector(boardSelector);
      if (!board) return false;
      const rect = board.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(board);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return Number(style.opacity || "1") > 0;
    };

    const markBoardVisible = () => {
      if (state.boardVisibleMs !== null) return;
      if (isBoardVisible()) state.boardVisibleMs = performance.now();
    };

    const startBoardObservers = () => {
      const observer = new MutationObserver(markBoardVisible);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      const tick = () => {
        markBoardVisible();
        if (state.boardVisibleMs === null) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startBoardObservers, { once: true });
    } else {
      startBoardObservers();
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const candidate = entry.renderTime || entry.loadTime || entry.startTime;
          if (candidate > 0) state.lcpMs = candidate;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          lcpObserver.takeRecords();
        }
      });
    } catch {
      // Best-effort metric capture.
    }

    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            state.fcpMs = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: "paint", buffered: true });
    } catch {
      // Best-effort metric capture.
    }

    const originalLog = console.log.bind(console);
    console.log = (...args) => {
      try {
        const joined = args.map((value) => String(value)).join(" ");
        if (state.engineReadyMs === null && joined.includes("[useStockfish] Engine ready")) {
          state.engineReadyMs = performance.now();
        }
      } catch {
        // Continue with original logging.
      }
      originalLog(...args);
    };
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.clearBrowserCache");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: SLOW_4G.latencyMs,
    downloadThroughput: SLOW_4G.downloadThroughputBytesPerSec,
    uploadThroughput: SLOW_4G.uploadThroughputBytesPerSec,
    connectionType: "cellular3g",
  });

  const runStart = performance.now();
  const requests = [];
  const requestsByRef = new Map();

  page.on("request", (request) => {
    const entry = {
      url: request.url(),
      shortUrl: shortUrl(request.url()),
      method: request.method(),
      resourceType: request.resourceType(),
      startMs: performance.now() - runStart,
      responseStartMs: null,
      endMs: null,
      durationMs: null,
      status: null,
      fromServiceWorker: false,
      failed: null,
      requestHeadersSize: null,
      requestBodySize: null,
      responseHeadersSize: null,
      responseBodySize: null,
    };
    requests.push(entry);
    requestsByRef.set(request, entry);
  });

  page.on("response", (response) => {
    const request = response.request();
    const entry = requestsByRef.get(request);
    if (!entry) return;
    entry.responseStartMs = performance.now() - runStart;
    entry.status = response.status();
    entry.fromServiceWorker = response.fromServiceWorker();
  });

  page.on("requestfinished", async (request) => {
    const entry = requestsByRef.get(request);
    if (!entry) return;
    entry.endMs = performance.now() - runStart;
    entry.durationMs = entry.endMs - entry.startMs;
    try {
      const sizes = await request.sizes();
      entry.requestHeadersSize = sizes.requestHeadersSize;
      entry.requestBodySize = sizes.requestBodySize;
      entry.responseHeadersSize = sizes.responseHeadersSize;
      entry.responseBodySize = sizes.responseBodySize;
    } catch {
      // Ignore missing transfer size details.
    }
  });

  page.on("requestfailed", (request) => {
    const entry = requestsByRef.get(request);
    if (!entry) return;
    entry.failed = request.failure()?.errorText ?? "Unknown failure";
    entry.endMs = performance.now() - runStart;
    entry.durationMs = entry.endMs - entry.startMs;
  });

  let filmstripDir = null;
  let stopFilmstrip = false;
  let filmstripPromise = null;
  if (captureArtifacts) {
    filmstripDir = path.join(runRootDir, `run-${String(runIndex).padStart(2, "0")}`, "filmstrip");
    await fs.mkdir(filmstripDir, { recursive: true });
    filmstripPromise = (async () => {
      let frame = 0;
      while (!stopFilmstrip) {
        const elapsed = performance.now() - runStart;
        const frameName = `${String(frame).padStart(3, "0")}-${Math.round(elapsed)}ms.png`;
        const framePath = path.join(filmstripDir, frameName);
        try {
          await page.screenshot({ path: framePath });
        } catch {
          break;
        }
        frame += 1;

        if (elapsed > MAX_RUN_MS) break;
        await page.waitForTimeout(FILMSTRIP_INTERVAL_MS);

        const boardVisibleMs = await page
          .evaluate(() => window.__perfCapture?.boardVisibleMs ?? null)
          .catch(() => null);
        const nextElapsed = performance.now() - runStart;
        if (boardVisibleMs !== null && nextElapsed > boardVisibleMs + FILMSTRIP_EXTRA_MS) {
          break;
        }
      }
    })();
  }

  try {
    await page.goto(TARGET_URL, { waitUntil: "commit", timeout: MAX_RUN_MS });
    await page.waitForFunction(
      () => window.__perfCapture?.boardVisibleMs !== null,
      undefined,
      {
        timeout: MAX_RUN_MS,
      },
    );
    await page.waitForTimeout(1500);
    if (MAX_ENGINE_WAIT_MS > 0) {
      await page
        .waitForFunction(
          () => window.__perfCapture?.engineReadyMs !== null,
          undefined,
          {
            timeout: MAX_ENGINE_WAIT_MS,
          },
        )
        .catch(() => {});
    }

    const metrics = await page.evaluate(() => window.__perfCapture);

    if (captureArtifacts) {
      const runDir = path.join(runRootDir, `run-${String(runIndex).padStart(2, "0")}`);
      await fs.mkdir(runDir, { recursive: true });

      const waterfallRows = requests
        .map((request, i) => ({
          index: i + 1,
          method: request.method,
          resourceType: request.resourceType,
          url: request.shortUrl,
          startMs: Number(request.startMs?.toFixed(2)),
          responseStartMs:
            typeof request.responseStartMs === "number"
              ? Number(request.responseStartMs.toFixed(2))
              : "",
          endMs: typeof request.endMs === "number" ? Number(request.endMs.toFixed(2)) : "",
          durationMs:
            typeof request.durationMs === "number" ? Number(request.durationMs.toFixed(2)) : "",
          status: request.status ?? "",
          fromServiceWorker: request.fromServiceWorker ? "true" : "false",
          responseBodySize: request.responseBodySize ?? "",
          failed: request.failed ?? "",
        }))
        .sort((a, b) => a.startMs - b.startMs);

      const keyRequests = waterfallRows.filter((row) =>
        /(index\.html|assets\/.*\.(css|js)|problems\.json|stockfish-18-lite-single\.(js|wasm))/.test(
          row.url,
        ),
      );

      await fs.writeFile(
        path.join(runDir, "waterfall.json"),
        JSON.stringify(waterfallRows, null, 2),
        "utf8",
      );
      await fs.writeFile(path.join(runDir, "waterfall.csv"), toCsv(waterfallRows), "utf8");
      await fs.writeFile(
        path.join(runDir, "waterfall-key.csv"),
        toCsv(keyRequests),
        "utf8",
      );
    }

    return {
      run: runIndex,
      boardVisibleMs: metrics.boardVisibleMs,
      lcpMs: metrics.lcpMs,
      fcpMs: metrics.fcpMs,
      engineReadyMs: metrics.engineReadyMs,
      timedOutEngineReady: metrics.engineReadyMs === null,
      capturedArtifacts: captureArtifacts,
      filmstripDir,
      totalRequests: requests.length,
    };
  } finally {
    stopFilmstrip = true;
    if (filmstripPromise) await filmstripPromise.catch(() => {});
    await context.close();
    await browser.close();
  }
}

function createSummaryMarkdown(result) {
  const { runCount, targetUrl, generatedAt, summaries, runs, artifactRun } = result;
  const board = summaries.boardVisibleMs;
  const lcp = summaries.lcpMs;
  const fcp = summaries.fcpMs;
  const engine = summaries.engineReadyMs;

  const lines = [];
  lines.push("# Board-Visible Performance PoC");
  lines.push("");
  lines.push("## Setup");
  lines.push("");
  lines.push(`- URL: \`${targetUrl}\``);
  lines.push(`- Generated: \`${generatedAt}\``);
  lines.push(`- Runs: \`${runCount}\` cold-load runs`);
  lines.push(
    "- Network emulation: `Slow 4G` (`1.6 Mbps down`, `0.75 Mbps up`, `750 ms RTT`) via CDP",
  );
  lines.push("- Cache behavior: browser cache disabled + fresh context per run");
  lines.push("");
  lines.push("## Distribution");
  lines.push("");
  lines.push("| Metric | n | min | p50 | p90 | p95 | max | mean | stddev |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");

  const addRow = (label, summary) => {
    if (!summary) {
      lines.push(`| ${label} | 0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |`);
      return;
    }
    lines.push(
      `| ${label} | ${summary.count} | ${summary.min.toFixed(2)} | ${summary.p50.toFixed(2)} | ${summary.p90.toFixed(2)} | ${summary.p95.toFixed(2)} | ${summary.max.toFixed(2)} | ${summary.mean.toFixed(2)} | ${summary.stddev.toFixed(2)} |`,
    );
  };

  addRow("Board visible (ms)", board);
  addRow("LCP (ms)", lcp);
  addRow("FCP (ms)", fcp);
  addRow("Engine ready (ms)", engine);

  lines.push("");
  lines.push("## Per-run Raw Metrics");
  lines.push("");
  lines.push("| Run | Board visible | LCP | FCP | Engine ready | Requests |");
  lines.push("|---:|---:|---:|---:|---:|---:|");
  for (const run of runs) {
    lines.push(
      `| ${run.run} | ${run.boardVisibleMs?.toFixed(2) ?? "n/a"} | ${run.lcpMs?.toFixed(2) ?? "n/a"} | ${run.fcpMs?.toFixed(2) ?? "n/a"} | ${run.engineReadyMs?.toFixed(2) ?? "n/a"} | ${run.totalRequests} |`,
    );
  }

  if (artifactRun) {
    lines.push("");
    lines.push("## Artifacts");
    lines.push("");
    lines.push(`- Filmstrip directory: \`${artifactRun.filmstripDir}\``);
    lines.push(
      `- Waterfall (all requests CSV): \`${path.join(artifactRun.runDir, "waterfall.csv")}\``,
    );
    lines.push(
      `- Waterfall (key requests CSV): \`${path.join(artifactRun.runDir, "waterfall-key.csv")}\``,
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  assertPositiveInt("RUNS", RUNS);
  assertPositiveInt("FILMSTRIP_RUN", FILMSTRIP_RUN);

  const sessionDir = path.join(OUT_DIR, toTimestamp());
  await fs.mkdir(sessionDir, { recursive: true });

  const runs = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const captureArtifacts = run === FILMSTRIP_RUN;
    const runResult = await captureRun(run, sessionDir, captureArtifacts);
    runs.push(runResult);
    console.log(
      `[run ${run}/${RUNS}] board=${ms(runResult.boardVisibleMs)} lcp=${ms(runResult.lcpMs)} fcp=${ms(runResult.fcpMs)} engine=${ms(runResult.engineReadyMs)} requests=${runResult.totalRequests}`,
    );
  }

  const summaries = {
    boardVisibleMs: summarize(
      runs.map((run) => run.boardVisibleMs).filter((value) => typeof value === "number"),
    ),
    lcpMs: summarize(
      runs.map((run) => run.lcpMs).filter((value) => typeof value === "number"),
    ),
    fcpMs: summarize(
      runs.map((run) => run.fcpMs).filter((value) => typeof value === "number"),
    ),
    engineReadyMs: summarize(
      runs.map((run) => run.engineReadyMs).filter((value) => typeof value === "number"),
    ),
  };

  const artifactRun = runs.find((run) => run.capturedArtifacts)
    ? {
        runNumber: runs.find((run) => run.capturedArtifacts).run,
        filmstripDir: runs.find((run) => run.capturedArtifacts).filmstripDir,
        runDir: path.join(
          sessionDir,
          `run-${String(runs.find((run) => run.capturedArtifacts).run).padStart(2, "0")}`,
        ),
      }
    : null;

  const summaryPayload = {
    generatedAt: new Date().toISOString(),
    runCount: RUNS,
    targetUrl: TARGET_URL,
    throttling: SLOW_4G,
    runs,
    summaries,
    artifactRun,
  };

  await fs.writeFile(
    path.join(sessionDir, "results.json"),
    JSON.stringify(summaryPayload, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(sessionDir, "summary.md"),
    createSummaryMarkdown(summaryPayload),
    "utf8",
  );

  console.log("");
  console.log(`Wrote results to: ${sessionDir}`);
  console.log(`Summary markdown: ${path.join(sessionDir, "summary.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
