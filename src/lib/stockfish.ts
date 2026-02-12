import type { ParsedMove, PromotionPiece, Square } from "@/types";
import { PROMOTION_PIECES } from "@/types";

const STOCKFISH_PATH = "/stockfish/stockfish-18-lite-single.js";
const DEFAULT_DEPTH = 15;
const VALID_PROMOTIONS = new Set<string>(PROMOTION_PIECES);

// ---------------------------------------------------------------------------
// UCI response types
// ---------------------------------------------------------------------------

export interface AnalysisScore {
  type: "mate" | "cp";
  value: number;
}

export interface InfoLine {
  depth: number;
  score: AnalysisScore | null;
  pv: string[];
}

export interface AnalysisResult {
  bestMove: string | null;
  score: AnalysisScore | null;
  pv: string[];
  depth: number;
}

// ---------------------------------------------------------------------------
// UCI response parsing (pure functions)
// ---------------------------------------------------------------------------

/**
 * Returns the best move UCI string, null for "bestmove (none)",
 * or undefined if the line isn't a bestmove line at all.
 */
export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith("bestmove")) return undefined;
  const match = /^bestmove\s+(\S+)/.exec(line);
  if (!match?.[1] || match[1] === "(none)") return null;
  return match[1];
}

export function parseInfoLine(line: string): InfoLine | null {
  if (!line.startsWith("info ")) return null;

  const depthMatch = /\bdepth\s+(\d+)/.exec(line);
  if (!depthMatch?.[1]) return null;
  const depth = Number(depthMatch[1]);

  let score: AnalysisScore | null = null;
  const mateMatch = /\bscore\s+mate\s+(-?\d+)/.exec(line);
  const cpMatch = /\bscore\s+cp\s+(-?\d+)/.exec(line);

  if (mateMatch?.[1]) {
    score = { type: "mate", value: Number(mateMatch[1]) };
  } else if (cpMatch?.[1]) {
    score = { type: "cp", value: Number(cpMatch[1]) };
  }

  const pvIndex = line.indexOf(" pv ");
  const pv = pvIndex >= 0 ? line.slice(pvIndex + 4).trim().split(/\s+/) : [];

  return { depth, score, pv };
}

// ---------------------------------------------------------------------------
// UCI move conversion
// ---------------------------------------------------------------------------

export function uciToParsedMove(uci: string): ParsedMove {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promo = uci.length > 4 ? uci[4] : undefined;
  const promotion: PromotionPiece | undefined =
    promo !== undefined && VALID_PROMOTIONS.has(promo)
      ? (promo as PromotionPiece)
      : undefined;
  return { from, to, promotion };
}

// ---------------------------------------------------------------------------
// StockfishEngine
// ---------------------------------------------------------------------------

type EngineState = "idle" | "initializing" | "ready" | "analyzing" | "disposed";

export class StockfishEngine {
  private worker: Worker | null = null;
  private state: EngineState = "idle";
  private messageHandler: ((line: string) => void) | null = null;
  private analysisId = 0;

  get isReady(): boolean {
    return this.state === "ready";
  }

  get isDisposed(): boolean {
    return this.state === "disposed";
  }

  async init(): Promise<void> {
    if (this.state !== "idle") return;
    this.state = "initializing";

    console.log("[SF] Creating Worker from", STOCKFISH_PATH);
    this.worker = new Worker(STOCKFISH_PATH);

    this.worker.addEventListener("error", (e) => {
      console.error("[SF] Worker error:", e.message);
    });

    this.worker.addEventListener("message", (e: MessageEvent<string>) => {
      const data = typeof e.data === "string" ? e.data : String(e.data);
      for (const line of data.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) this.messageHandler?.(trimmed);
      }
    });

    console.log("[SF] Sending 'uci'...");
    await this.sendAndWait("uci", (line) => line === "uciok");
    console.log("[SF] Got uciok. Sending 'isready'...");
    await this.sendAndWait("isready", (line) => line === "readyok");

    console.log("[SF] Engine ready!");
    this.state = "ready";
  }

  async analyze(fen: string, depth: number = DEFAULT_DEPTH): Promise<AnalysisResult> {
    this.ensureReady();

    if (this.state === "analyzing") {
      console.log("[SF] Stopping previous analysis...");
      this.worker!.postMessage("stop");
      await this.waitForBestMove();
    }

    this.state = "analyzing";
    const id = ++this.analysisId;

    const collected: { info: InfoLine | null } = { info: null };

    console.log(`[SF] analyze(depth=${depth}) fen=${fen.slice(0, 40)}...`);
    this.worker!.postMessage(`position fen ${fen}`);

    const bestMovePromise = new Promise<string | null>((resolve) => {
      this.messageHandler = (line) => {
        if (id !== this.analysisId) return;

        const info = parseInfoLine(line);
        if (info && (collected.info === null || info.depth >= collected.info.depth)) {
          collected.info = info;
        }

        const bm = parseBestMove(line);
        if (bm !== undefined) {
          resolve(bm);
        }
      };
    });

    this.worker!.postMessage(`go depth ${depth}`);
    const bestMove = await bestMovePromise;

    if (!this.isDisposed) this.state = "ready";
    this.messageHandler = null;

    const result: AnalysisResult = {
      bestMove,
      score: collected.info?.score ?? null,
      pv: collected.info?.pv ?? [],
      depth: collected.info?.depth ?? 0,
    };
    console.log(`[SF] analyze result: bestMove=${result.bestMove} score=${JSON.stringify(result.score)} depth=${result.depth}`);
    return result;
  }

  stop(): void {
    if (this.state === "analyzing" && this.worker) {
      this.worker.postMessage("stop");
    }
  }

  dispose(): void {
    if (this.state === "disposed") return;
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.state = "disposed";
    this.messageHandler = null;
  }

  private ensureReady(): void {
    if (this.state === "disposed") throw new Error("Engine is disposed");
    if (this.state !== "ready" && this.state !== "analyzing") {
      throw new Error(`Engine not ready (state: ${this.state})`);
    }
  }

  private sendAndWait(command: string, isDone: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      this.messageHandler = (line) => {
        if (isDone(line)) {
          this.messageHandler = null;
          resolve();
        }
      };
      this.worker!.postMessage(command);
    });
  }

  private waitForBestMove(): Promise<void> {
    return new Promise((resolve) => {
      const prev = this.messageHandler;
      this.messageHandler = (line) => {
        prev?.(line);
        if (parseBestMove(line) !== undefined) {
          this.messageHandler = prev;
          resolve();
        }
      };
    });
  }
}
