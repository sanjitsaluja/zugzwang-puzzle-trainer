import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const srcDir = join(rootDir, "src");
const allowedLiteralFiles = new Set([
  join(srcDir, "styles", "tokens.css"),
]);

const includeExtensions = new Set([".ts", ".tsx", ".css"]);

const colorLiteralPattern = /(?<!&)#([0-9a-fA-F]{3,8})\b|\brgba?\(|\bhsla?\(/g;
const pixelLiteralPattern = /\b\d+(\.\d+)?px\b/g;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!Array.from(includeExtensions).some((extension) => fullPath.endsWith(extension))) continue;
    files.push(fullPath);
  }

  return files;
}

function lineNumberFromIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

function collectMatches(content, pattern, kind) {
  const matches = [];
  pattern.lastIndex = 0;
  let match = pattern.exec(content);
  while (match) {
    matches.push({
      kind,
      value: match[0],
      line: lineNumberFromIndex(content, match.index),
    });
    match = pattern.exec(content);
  }
  return matches;
}

const files = await collectFiles(srcDir);
const violations = [];

for (const file of files) {
  if (allowedLiteralFiles.has(file)) continue;
  const content = await readFile(file, "utf8");
  const fileViolations = [
    ...collectMatches(content, colorLiteralPattern, "color"),
    ...collectMatches(content, pixelLiteralPattern, "size"),
  ];
  for (const violation of fileViolations) {
    violations.push({
      file,
      ...violation,
    });
  }
}

if (violations.length > 0) {
  console.error("Token lint failed. Use design tokens instead of literal values.");
  for (const violation of violations) {
    console.error(
      `${relative(rootDir, violation.file)}:${violation.line} ${violation.kind} literal "${violation.value}"`,
    );
  }
  process.exit(1);
}

console.log("Token lint passed.");
