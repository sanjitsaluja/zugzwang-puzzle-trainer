/**
 * Integration test: verify how Stockfish reports mate scores using REAL puzzles
 * from our problems.json dataset.
 *
 * Run: node scripts/test-stockfish-integration.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = resolve(__dirname, "../node_modules/stockfish/bin/stockfish.js");
const PUZZLES_PATH = resolve(__dirname, "../public/problems.json");

const puzzles = JSON.parse(readFileSync(PUZZLES_PATH, "utf8")).problems;

function parseMoveStr(raw) {
  const [from, toRaw] = raw.split("-");
  const to = toRaw.slice(0, 2);
  const promotion = toRaw.length > 2 ? toRaw[2] : undefined;
  return { from, to, promotion, uci: from + to + (promotion ?? "") };
}

function createEngine() {
  return new Promise((resolveEngine, reject) => {
    const timeout = setTimeout(() => reject(new Error("Engine init timeout")), 30000);
    const proc = spawn("node", [ENGINE_PATH], { stdio: ["pipe", "pipe", "pipe"] });
    const listeners = [];

    proc.on("error", reject);
    proc.stderr.on("data", () => {});

    const rl = createInterface({ input: proc.stdout });
    rl.on("line", (line) => {
      line = line.trim();
      if (!line) return;
      for (const cb of [...listeners]) cb(line);
    });

    function send(cmd) { proc.stdin.write(cmd + "\n"); }

    function waitFor(predicate, timeoutMs = 30000) {
      return new Promise((res, rej) => {
        const timer = setTimeout(() => rej(new Error("waitFor timeout")), timeoutMs);
        const cb = (line) => {
          if (predicate(line)) {
            clearTimeout(timer);
            listeners.splice(listeners.indexOf(cb), 1);
            res(line);
          }
        };
        listeners.push(cb);
      });
    }

    async function init() {
      send("uci");
      await waitFor(l => l === "uciok");
      send("isready");
      await waitFor(l => l === "readyok");
    }

    function parseResult(infoLines, bestMoveLine) {
      const bmMatch = /^bestmove\s+(\S+)/.exec(bestMoveLine);
      const bestMove = bmMatch?.[1] === "(none)" ? null : (bmMatch?.[1] ?? null);
      let best = null;
      for (const line of infoLines) {
        const dm = /\bdepth\s+(\d+)/.exec(line);
        if (!dm) continue;
        const d = Number(dm[1]);
        if (!best || d >= best.depth) {
          const mm = /\bscore\s+mate\s+(-?\d+)/.exec(line);
          const cm = /\bscore\s+cp\s+(-?\d+)/.exec(line);
          best = {
            depth: d,
            score: mm ? { type: "mate", value: Number(mm[1]) }
              : cm ? { type: "cp", value: Number(cm[1]) }
              : null,
          };
        }
      }
      return { bestMove, score: best?.score ?? null, depth: best?.depth ?? 0 };
    }

    async function analyze(posCmd, depth = 15) {
      const infoLines = [];
      const collector = (l) => { if (l.startsWith("info ") && l.includes(" score ")) infoLines.push(l); };
      listeners.push(collector);
      send(posCmd);
      send(`go depth ${depth}`);
      const bm = await waitFor(l => l.startsWith("bestmove"));
      listeners.splice(listeners.indexOf(collector), 1);
      return parseResult(infoLines, bm);
    }

    init().then(() => {
      clearTimeout(timeout);
      resolveEngine({ analyze, dispose: () => { send("quit"); proc.kill(); } });
    }).catch(reject);
  });
}

function getPuzzle(id) {
  return puzzles.find(p => p.problemid === id);
}

async function testPuzzle(engine, puzzleId, depth = 18) {
  const p = getPuzzle(puzzleId);
  if (!p) { console.log(`  Puzzle ${puzzleId} not found!`); return; }

  const solution = p.moves.split(";").map(parseMoveStr);
  console.log(`\n--- Puzzle #${p.problemid}: ${p.type}, ${p.first} ---`);
  console.log(`  FEN: ${p.fen}`);
  console.log(`  Solution: ${solution.map(m => m.uci).join(" → ")}`);

  // Analyze starting position
  const r0 = await engine.analyze(`position fen ${p.fen}`, depth);
  console.log(`\n  [Start] bestMove=${r0.bestMove}  score=${JSON.stringify(r0.score)}`);
  console.log(`    Expected first move: ${solution[0].uci}`);

  if (solution.length === 1) {
    console.log("  (Mate in One — no opponent move needed)");
    return;
  }

  // Apply the CORRECT first user move, analyze from opponent's perspective
  const userMove1 = solution[0].uci;
  const r1 = await engine.analyze(`position fen ${p.fen} moves ${userMove1}`, depth);
  console.log(`\n  [After user plays ${userMove1}] bestMove=${r1.bestMove}  score=${JSON.stringify(r1.score)}`);
  console.log(`    Expected opponent move: ${solution[1].uci}`);
  console.log(`    ★ This score is what isCorrectMove() checks.`);
  console.log(`    ★ remainingMateDepth would be: ${Math.floor(solution.length / 2)}`);
  if (r1.score?.type === "mate") {
    const remaining = Math.floor(solution.length / 2);
    const passes = r1.score.value < 0 && Math.abs(r1.score.value) <= remaining;
    console.log(`    ★ isCorrectMove check: value(${r1.score.value}) < 0 && abs(${r1.score.value}) <= ${remaining} → ${passes}`);
  } else {
    console.log(`    ★ isCorrectMove would FAIL: score is not mate type!`);
  }

  // If mate in 3, also test after user's second move
  if (solution.length >= 5) {
    const opMove = solution[1].uci;
    const userMove2 = solution[2].uci;
    const r2 = await engine.analyze(
      `position fen ${p.fen} moves ${userMove1} ${opMove} ${userMove2}`, depth
    );
    console.log(`\n  [After ${userMove1} ${opMove} ${userMove2}] bestMove=${r2.bestMove}  score=${JSON.stringify(r2.score)}`);
    console.log(`    Expected opponent move: ${solution[3].uci}`);
  }
}

async function main() {
  console.log("=== Stockfish Integration Test (Real Puzzles) ===");

  const engine = await createEngine();
  console.log("Engine initialized.");

  // Test Mate-in-One puzzles
  await testPuzzle(engine, 1);   // Mate in One
  await testPuzzle(engine, 2);   // Mate in One

  // Test Mate-in-Two puzzles
  await testPuzzle(engine, 307); // Mate in Two
  await testPuzzle(engine, 308); // Mate in Two
  await testPuzzle(engine, 309); // Mate in Two

  // Test Mate-in-Three puzzles
  await testPuzzle(engine, 3719); // Mate in Three
  await testPuzzle(engine, 3721); // Mate in Three

  engine.dispose();
  console.log("\n=== DONE ===");
  setTimeout(() => process.exit(0), 500);
}

main().catch((e) => { console.error(e); process.exit(1); });
