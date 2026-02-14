import { mateDepthFromType } from "@/lib/puzzles";
import type { PuzzleData } from "@/types";

export interface RetryQueueItem {
  puzzleId: number;
  mateIn: number;
  missCount: number;
  lastAttemptAt: number;
}

export interface TypeStats {
  mateIn: number;
  solved: number;
  avgTimeMs: number | null;
  trend: number | null;
}

export interface PuzzleStats {
  puzzleId: number;
  solved: boolean;
  missCount: number;
  lastAttemptAt: number | null;
  attempts: Attempt[];
}

export interface PuzzleDataProvider {
  getMateIn(puzzleId: number): number;
  getTotalCount(): number;
}

interface AttemptJSON {
  p: number;
  t: number;
  ms: number;
  ok: boolean;
}

interface RetryAttemptJSON {
  t: number;
  ms: number;
  ok: boolean;
}

interface StoredStats {
  currentPuzzle?: number;
  bestStreak?: number;
  history?: AttemptJSON[];
  retries?: Record<string, RetryAttemptJSON[]>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function parseAttemptJSON(value: unknown): AttemptJSON {
  if (!isObjectRecord(value)) throw new Error("Invalid attempt entry");

  const puzzleId = toPositiveInteger(value["p"]);
  const timestamp = typeof value["t"] === "number" ? value["t"] : null;
  const timeMs = typeof value["ms"] === "number" ? value["ms"] : null;
  const success = typeof value["ok"] === "boolean" ? value["ok"] : null;

  if (puzzleId === null || timestamp === null || timeMs === null || success === null) {
    throw new Error("Invalid attempt payload");
  }

  return {
    p: puzzleId,
    t: timestamp,
    ms: timeMs,
    ok: success,
  };
}

function parseRetryAttemptJSON(value: unknown): RetryAttemptJSON {
  if (!isObjectRecord(value)) throw new Error("Invalid retry entry");

  const timestamp = typeof value["t"] === "number" ? value["t"] : null;
  const timeMs = typeof value["ms"] === "number" ? value["ms"] : null;
  const success = typeof value["ok"] === "boolean" ? value["ok"] : null;

  if (timestamp === null || timeMs === null || success === null) {
    throw new Error("Invalid retry payload");
  }

  return {
    t: timestamp,
    ms: timeMs,
    ok: success,
  };
}

export class Attempt {
  puzzleId: number;
  timestamp: number;
  timeMs: number;
  success: boolean;

  constructor(puzzleId: number, timeMs: number, success: boolean) {
    this.puzzleId = puzzleId;
    this.timestamp = Date.now();
    this.timeMs = timeMs;
    this.success = success;
  }

  toJSON(): AttemptJSON {
    return {
      p: this.puzzleId,
      t: this.timestamp,
      ms: this.timeMs,
      ok: this.success,
    };
  }

  static fromJSON(data: AttemptJSON): Attempt {
    const attempt = new Attempt(data.p, data.ms, data.ok);
    attempt.timestamp = data.t;
    return attempt;
  }
}

export class StatsManager {
  static STORAGE_KEY = "zugzwang";
  static DEBOUNCE_MS = 2000;

  currentPuzzle: number;
  bestStreak: number;
  history: Attempt[];
  retries: Map<number, Attempt[]>;
  saveDebounced: () => void;

  private readonly puzzleData: PuzzleDataProvider;
  private readonly beforeUnloadHandler: () => void;

  constructor(puzzleData: PuzzleDataProvider) {
    this.puzzleData = puzzleData;
    this.currentPuzzle = 1;
    this.bestStreak = 0;
    this.history = [];
    this.retries = new Map();
    this.beforeUnloadHandler = () => this.save();

    this.saveDebounced = this._debounce(
      () => this.save(),
      StatsManager.DEBOUNCE_MS,
    );
    this._bindUnloadHandler();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(StatsManager.STORAGE_KEY);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      if (!isObjectRecord(parsed)) {
        throw new Error("Invalid stats payload");
      }
      const data = parsed as StoredStats;

      const currentPuzzle = this._normalizeCurrentPuzzle(
        toPositiveInteger(data.currentPuzzle) ?? 1,
      );
      const bestStreak = toNonNegativeInteger(data.bestStreak) ?? 0;
      const history = (data.history ?? [])
        .map((h) => parseAttemptJSON(h))
        .filter((h) => this._isKnownPuzzleId(h.p))
        .map((h) => Attempt.fromJSON(h));

      const retries = new Map<number, Attempt[]>();
      const retriesRaw = data.retries ?? {};
      if (!isObjectRecord(retriesRaw)) {
        throw new Error("Invalid retries payload");
      }

      for (const [rawPuzzleId, attemptsRaw] of Object.entries(retriesRaw)) {
        const puzzleId = toPositiveInteger(Number(rawPuzzleId));
        if (puzzleId === null || !Array.isArray(attemptsRaw)) {
          throw new Error("Invalid retry key");
        }
        if (!this._isKnownPuzzleId(puzzleId)) {
          continue;
        }

        const attempts = attemptsRaw.map((attemptRaw) => {
          const attempt = parseRetryAttemptJSON(attemptRaw);
          return Attempt.fromJSON({
            p: puzzleId,
            t: attempt.t,
            ms: attempt.ms,
            ok: attempt.ok,
          });
        });

        retries.set(puzzleId, attempts);
      }

      this.currentPuzzle = currentPuzzle;
      this.bestStreak = bestStreak;
      this.history = history;
      this.retries = retries;
    } catch (error) {
      console.error("Failed to load stats, resetting:", error);
      this.reset();
    }
  }

  save(): void {
    const data: StoredStats = {
      currentPuzzle: this.currentPuzzle,
      bestStreak: this.bestStreak,
      history: this.history.map((attempt) => attempt.toJSON()),
      retries: Object.fromEntries(
        Array.from(this.retries.entries()).map(([id, attempts]) => [
          id,
          attempts.map((attempt) => ({
            t: attempt.timestamp,
            ms: attempt.timeMs,
            ok: attempt.success,
          })),
        ]),
      ),
    };

    localStorage.setItem(StatsManager.STORAGE_KEY, JSON.stringify(data));
  }

  reset(): void {
    this.currentPuzzle = 1;
    this.bestStreak = 0;
    this.history = [];
    this.retries = new Map();
    this.save();
  }

  recordAttempt(puzzleId: number, timeMs: number, success: boolean): void {
    if (!this._isKnownPuzzleId(puzzleId)) {
      throw new Error(`Invalid puzzle id: ${puzzleId}`);
    }
    if (!Number.isFinite(timeMs) || timeMs < 0) {
      throw new Error(`Invalid attempt time: ${timeMs}`);
    }

    const isFirstAttempt = !this._hasAttempted(puzzleId);

    if (isFirstAttempt) {
      this._recordFirstAttempt(puzzleId, timeMs, success);
    } else {
      this._recordRetry(puzzleId, timeMs, success);
    }

    if (success) {
      this._advanceCurrentPuzzleOnSuccess(puzzleId);
      this._updateBestStreak();
    }

    this.saveDebounced();
  }

  getSolved(): number {
    return this.history.filter((attempt) => attempt.success).length;
  }

  getRetryQueue(): RetryQueueItem[] {
    const queue: RetryQueueItem[] = [];

    for (const attempt of this.history) {
      if (attempt.success) continue;

      const retryAttempts = this.retries.get(attempt.puzzleId) ?? [];
      const solvedInRetry = retryAttempts.some((retryAttempt) => retryAttempt.success);

      if (solvedInRetry) continue;

      const lastAttemptAt = this._getLastAttemptAt(attempt.puzzleId);
      if (lastAttemptAt === null) continue;

      queue.push({
        puzzleId: attempt.puzzleId,
        mateIn: this.puzzleData.getMateIn(attempt.puzzleId),
        missCount: this._getMissCount(attempt.puzzleId),
        lastAttemptAt,
      });
    }

    return queue.sort((a, b) => b.lastAttemptAt - a.lastAttemptAt);
  }

  getCurrentStreak(): number {
    const timeline = this._buildTimeline();
    let streak = 0;

    for (const attempt of timeline) {
      if (attempt.success) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  getBestStreak(): number {
    return this.bestStreak;
  }

  getSuccessRate(): number {
    if (this.history.length === 0) return 0;
    return Math.round((this.getSolved() / this.history.length) * 100);
  }

  getTotalAttempted(): number {
    return this.history.length;
  }

  getCurrentPuzzle(): number {
    return this.currentPuzzle;
  }

  getTotalPuzzles(): number {
    return this.puzzleData.getTotalCount();
  }

  getStatsByType(mateIn: number): TypeStats {
    const attemptsOfType = this.history.filter(
      (attempt) => this.puzzleData.getMateIn(attempt.puzzleId) === mateIn,
    );

    const successfulAttempts = attemptsOfType.filter((attempt) => attempt.success);
    const solved = successfulAttempts.length;

    const avgTimeMs =
      solved > 0
        ? Math.round(
            successfulAttempts.reduce((sum, attempt) => sum + attempt.timeMs, 0) / solved,
          )
        : null;

    const trend = this._calculateTrend(successfulAttempts);

    return {
      mateIn,
      solved,
      avgTimeMs,
      trend,
    };
  }

  getAllTypeStats(): TypeStats[] {
    return [1, 2, 3].map((mateIn) => this.getStatsByType(mateIn));
  }

  getPuzzleStats(puzzleId: number): PuzzleStats {
    const firstAttempt = this.history.find((attempt) => attempt.puzzleId === puzzleId);
    const retryAttempts = this.retries.get(puzzleId) ?? [];
    const allAttempts = firstAttempt ? [firstAttempt, ...retryAttempts] : [];

    const solved = allAttempts.some((attempt) => attempt.success);
    const missCount = allAttempts.filter((attempt) => !attempt.success).length;
    const lastAttemptAt =
      allAttempts.length > 0
        ? Math.max(...allAttempts.map((attempt) => attempt.timestamp))
        : null;

    return {
      puzzleId,
      solved,
      missCount,
      lastAttemptAt,
      attempts: allAttempts,
    };
  }

  dispose(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
  }

  private _recordFirstAttempt(puzzleId: number, timeMs: number, success: boolean): void {
    const attempt = new Attempt(puzzleId, timeMs, success);
    this.history.push(attempt);
  }

  private _recordRetry(puzzleId: number, timeMs: number, success: boolean): void {
    const attempt = new Attempt(puzzleId, timeMs, success);
    const existing = this.retries.get(puzzleId) ?? [];
    this.retries.set(puzzleId, [...existing, attempt]);
  }

  private _hasAttempted(puzzleId: number): boolean {
    return this.history.some((attempt) => attempt.puzzleId === puzzleId);
  }

  private _updateBestStreak(): void {
    const current = this.getCurrentStreak();
    if (current > this.bestStreak) {
      this.bestStreak = current;
    }
  }

  private _advanceCurrentPuzzleOnSuccess(puzzleId: number): void {
    if (puzzleId !== this.currentPuzzle) return;
    const totalPuzzles = Math.max(this.puzzleData.getTotalCount(), 1);
    this.currentPuzzle = Math.min(puzzleId + 1, totalPuzzles);
  }

  private _buildTimeline(): Attempt[] {
    const allAttempts = [...this.history, ...Array.from(this.retries.values()).flat()];
    return allAttempts.sort((a, b) => b.timestamp - a.timestamp);
  }

  private _getMissCount(puzzleId: number): number {
    return this.getPuzzleStats(puzzleId).missCount;
  }

  private _getLastAttemptAt(puzzleId: number): number | null {
    return this.getPuzzleStats(puzzleId).lastAttemptAt;
  }

  private _calculateTrend(successfulAttempts: Attempt[], sampleSize = 5): number | null {
    if (successfulAttempts.length < sampleSize * 2) {
      return null;
    }

    const firstN = successfulAttempts.slice(0, sampleSize);
    const lastN = successfulAttempts.slice(-sampleSize);

    const firstAvg = firstN.reduce((sum, attempt) => sum + attempt.timeMs, 0) / sampleSize;
    const lastAvg = lastN.reduce((sum, attempt) => sum + attempt.timeMs, 0) / sampleSize;
    if (firstAvg <= 0) {
      return null;
    }

    return Math.round(((lastAvg - firstAvg) / firstAvg) * 100);
  }

  private _debounce(fn: () => void, ms: number): () => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => fn(), ms);
    };
  }

  private _bindUnloadHandler(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  private _isKnownPuzzleId(puzzleId: number): boolean {
    if (!Number.isInteger(puzzleId) || puzzleId <= 0) {
      return false;
    }
    const totalPuzzles = this.puzzleData.getTotalCount();
    if (puzzleId > totalPuzzles) {
      return false;
    }

    try {
      this.puzzleData.getMateIn(puzzleId);
      return true;
    } catch {
      return false;
    }
  }

  private _normalizeCurrentPuzzle(puzzleId: number): number {
    const totalPuzzles = Math.max(this.puzzleData.getTotalCount(), 1);
    const clamped = Math.min(Math.max(1, puzzleId), totalPuzzles);
    return this._isKnownPuzzleId(clamped) ? clamped : 1;
  }
}

export function createPuzzleDataProvider(puzzles: PuzzleData[]): PuzzleDataProvider {
  const mateInByPuzzleId = new Map<number, number>();
  for (const puzzle of puzzles) {
    mateInByPuzzleId.set(puzzle.problemid, mateDepthFromType(puzzle.type));
  }

  return {
    getMateIn(puzzleId: number): number {
      const mateIn = mateInByPuzzleId.get(puzzleId);
      if (mateIn === undefined) {
        throw new Error(`Unknown puzzle id: ${puzzleId}`);
      }
      return mateIn;
    },
    getTotalCount(): number {
      return puzzles.length;
    },
  };
}
