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
const typographyLiteralPattern = /\b(font-size|font-weight|letter-spacing|line-height)\s*:\s*([^;]+);/g;
const typographyAllowedKeywords = new Set(["inherit", "initial", "unset", "normal"]);

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

function isTypographyTokenized(value) {
  const normalized = value.replace(/\s*!important\s*$/i, "").trim();
  const lower = normalized.toLowerCase();
  if (typographyAllowedKeywords.has(lower)) return true;
  return (
    normalized.startsWith("var(") ||
    normalized.startsWith("calc(") ||
    normalized.startsWith("clamp(") ||
    normalized.startsWith("min(") ||
    normalized.startsWith("max(")
  );
}

function collectTypographyMatches(content) {
  const matches = [];
  typographyLiteralPattern.lastIndex = 0;

  let match = typographyLiteralPattern.exec(content);
  while (match) {
    const [, property, rawValue] = match;
    if (!isTypographyTokenized(rawValue)) {
      matches.push({
        kind: "typography",
        value: `${property}: ${rawValue.trim()}`,
        line: lineNumberFromIndex(content, match.index),
      });
    }
    match = typographyLiteralPattern.exec(content);
  }

  return matches;
}

const files = await collectFiles(srcDir);
const violations = [];

for (const file of files) {
  if (allowedLiteralFiles.has(file)) continue;
  const content = await readFile(file, "utf8");
  const typographyViolations = file.endsWith(".css") ? collectTypographyMatches(content) : [];
  const fileViolations = [
    ...collectMatches(content, colorLiteralPattern, "color"),
    ...collectMatches(content, pixelLiteralPattern, "size"),
    ...typographyViolations,
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
