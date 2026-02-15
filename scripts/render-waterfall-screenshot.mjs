#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const [inputCsv, outputPng, ...titleParts] = process.argv.slice(2);
const title = titleParts.length > 0 ? titleParts.join(" ") : "Request Waterfall";

if (!inputCsv || !outputPng) {
  console.error("Usage: node scripts/render-waterfall-screenshot.mjs <input.csv> <output.png> [title]");
  process.exit(1);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = values[i] ?? "";
    }
    return row;
  });
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

const csvText = await fs.readFile(path.resolve(inputCsv), "utf8");
const rawRows = parseCsv(csvText);

if (rawRows.length === 0) {
  console.error("No rows found in input CSV.");
  process.exit(1);
}

const rows = rawRows.map((row) => {
  const start = toNumber(row.startMs);
  const responseStart = toNumber(row.responseStartMs, start);
  const endCandidate = row.endMs === "" ? null : toNumber(row.endMs);
  const end = endCandidate ?? Math.max(responseStart, start + 50);
  return {
    method: row.method,
    resourceType: row.resourceType,
    url: row.url,
    start,
    responseStart,
    end,
    status: row.status,
    pending: row.endMs === "",
    duration: end - start,
  };
});

const minStart = Math.min(...rows.map((row) => row.start));
const maxEnd = Math.max(...rows.map((row) => row.end));
const totalMs = Math.max(1, maxEnd - minStart);

const chartWidth = 980;
const rowHeight = 30;
const labelWidth = 470;
const timelineTickMs = 5000;

const ticks = [];
for (
  let tick = Math.floor(minStart / timelineTickMs) * timelineTickMs;
  tick <= maxEnd + timelineTickMs;
  tick += timelineTickMs
) {
  ticks.push(tick);
}

const rowHtml = rows
  .map((row) => {
    const left = ((row.start - minStart) / totalMs) * chartWidth;
    const width = Math.max(4, ((row.end - row.start) / totalMs) * chartWidth);
    const label = `${row.method} ${row.resourceType} ${row.url}`;
    const barClass = row.pending ? "bar pending" : "bar";
    const durationLabel = row.pending
      ? `>= ${(row.duration / 1000).toFixed(2)}s (in-flight)`
      : `${(row.duration / 1000).toFixed(2)}s`;
    return `
      <div class="row">
        <div class="label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
        <div class="lane">
          <div class="${barClass}" style="left:${left}px;width:${width}px;"></div>
          <div class="meta">${escapeHtml(durationLabel)} ${escapeHtml(row.status)}</div>
        </div>
      </div>
    `;
  })
  .join("\n");

const tickHtml = ticks
  .map((tick) => {
    const left = ((tick - minStart) / totalMs) * chartWidth;
    return `
      <div class="tick" style="left:${left}px;">
        <span>${((tick - minStart) / 1000).toFixed(1)}s</span>
      </div>
    `;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 20px;
        font-family: "SF Mono", Menlo, Consolas, monospace;
        color: #1f2937;
        background: #ffffff;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 20px;
      }
      .sub {
        margin: 0 0 16px;
        font-size: 12px;
        color: #4b5563;
      }
      .header {
        display: flex;
        gap: 12px;
        margin-left: ${labelWidth}px;
        position: relative;
        width: ${chartWidth}px;
        border-bottom: 1px solid #d1d5db;
        margin-bottom: 8px;
        height: 24px;
      }
      .tick {
        position: absolute;
        top: 0;
        bottom: 0;
        border-left: 1px dashed #d1d5db;
      }
      .tick span {
        position: absolute;
        top: 2px;
        left: 3px;
        font-size: 10px;
        color: #6b7280;
        background: #fff;
        padding: 0 2px;
      }
      .row {
        display: flex;
        align-items: center;
        min-height: ${rowHeight}px;
        border-bottom: 1px solid #f3f4f6;
      }
      .label {
        width: ${labelWidth}px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        padding-right: 8px;
      }
      .lane {
        position: relative;
        width: ${chartWidth}px;
        height: ${rowHeight}px;
      }
      .bar {
        position: absolute;
        top: 8px;
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(90deg, #0f766e, #14b8a6);
      }
      .bar.pending {
        background: repeating-linear-gradient(
          45deg,
          #2563eb,
          #2563eb 6px,
          #93c5fd 6px,
          #93c5fd 12px
        );
      }
      .meta {
        position: absolute;
        top: 8px;
        left: 6px;
        font-size: 10px;
        color: #111827;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">Span: ${(totalMs / 1000).toFixed(2)}s | Rows: ${rows.length}</p>
    <div class="header">${tickHtml}</div>
    <div class="rows">${rowHtml}</div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const height = Math.max(260, 140 + rows.length * rowHeight);
await page.setViewportSize({ width: 1550, height });
await page.setContent(html, { waitUntil: "load" });

await fs.mkdir(path.dirname(path.resolve(outputPng)), { recursive: true });
await page.screenshot({
  path: path.resolve(outputPng),
  fullPage: true,
});

await browser.close();
console.log(`Waterfall screenshot written: ${path.resolve(outputPng)}`);
