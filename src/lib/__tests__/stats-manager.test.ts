import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Attempt,
  StatsManager,
  type PuzzleDataProvider,
} from "@/lib/stats-manager";

const provider: PuzzleDataProvider = {
  getMateIn(puzzleId: number): number {
    const mod = puzzleId % 3;
    if (mod === 1) return 1;
    if (mod === 2) return 2;
    return 3;
  },
  getTotalCount(): number {
    return 4462;
  },
};

function readStoredStats(): unknown {
  const raw = localStorage.getItem(StatsManager.STORAGE_KEY);
  if (raw === null) return null;
  return JSON.parse(raw);
}

describe("Attempt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serializes and deserializes correctly", () => {
    const attempt = new Attempt(7, 12000, true);
    const json = attempt.toJSON();

    expect(json).toEqual({
      p: 7,
      t: Date.parse("2026-01-01T00:00:00.000Z"),
      ms: 12000,
      ok: true,
    });

    const restored = Attempt.fromJSON(json);
    expect(restored).toEqual(attempt);
  });
});

describe("StatsManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  it("records first attempt in history and advances current puzzle on success", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 8000, true);

    expect(manager.getTotalAttempted()).toBe(1);
    expect(manager.getSolved()).toBe(1);
    expect(manager.getCurrentPuzzle()).toBe(2);
    expect(manager.history).toHaveLength(1);
    expect(manager.retries.size).toBe(0);
    manager.dispose();
  });

  it("records retries after first attempt", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(2, 12000, false);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(2, 6000, true);

    expect(manager.history).toHaveLength(1);
    expect(manager.retries.get(2)).toHaveLength(1);
    expect(manager.getPuzzleStats(2).solved).toBe(true);
    expect(manager.getPuzzleStats(2).missCount).toBe(1);
    expect(manager.getCurrentPuzzle()).toBe(1);
    manager.dispose();
  });

  it("advances current puzzle when solved on retry", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 12000, false);
    expect(manager.getCurrentPuzzle()).toBe(1);

    vi.advanceTimersByTime(10);
    manager.recordAttempt(1, 4000, true);

    expect(manager.getCurrentPuzzle()).toBe(2);
    manager.dispose();
  });

  it("computes current and best streaks from timeline order", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 5000, true);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(2, 7000, false);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(2, 3000, true);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(3, 4000, true);

    expect(manager.getCurrentStreak()).toBe(2);
    expect(manager.getBestStreak()).toBe(2);
    manager.dispose();
  });

  it("returns retry queue for failed first attempts not yet solved", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(4, 10000, false);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(5, 9000, false);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(4, 5000, true);
    vi.advanceTimersByTime(10);
    manager.recordAttempt(5, 7000, false);

    const retryQueue = manager.getRetryQueue();
    expect(retryQueue).toHaveLength(1);
    expect(retryQueue[0]).toMatchObject({
      puzzleId: 5,
      mateIn: 2,
      missCount: 2,
    });
    manager.dispose();
  });

  it("computes type stats and trend from successful first attempts", () => {
    const typeOneProvider: PuzzleDataProvider = {
      getMateIn(): number {
        return 1;
      },
      getTotalCount(): number {
        return 10;
      },
    };
    const manager = new StatsManager(typeOneProvider);

    for (let puzzleId = 1; puzzleId <= 5; puzzleId += 1) {
      manager.recordAttempt(puzzleId, 10000, true);
      vi.advanceTimersByTime(10);
    }
    for (let puzzleId = 6; puzzleId <= 10; puzzleId += 1) {
      manager.recordAttempt(puzzleId, 5000, true);
      vi.advanceTimersByTime(10);
    }

    const typeStats = manager.getStatsByType(1);
    expect(typeStats).toEqual({
      mateIn: 1,
      solved: 10,
      avgTimeMs: 7500,
      trend: -50,
    });
    manager.dispose();
  });

  it("saves in the expected compact storage format", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 12000, true);
    vi.advanceTimersByTime(StatsManager.DEBOUNCE_MS);

    expect(readStoredStats()).toEqual({
      currentPuzzle: 2,
      bestStreak: 1,
      history: [{ p: 1, t: Date.parse("2026-01-01T00:00:00.000Z"), ms: 12000, ok: true }],
      retries: {},
    });
    manager.dispose();
  });

  it("flushes pending writes on dispose and cancels stale scheduled saves", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 12000, true);
    expect(readStoredStats()).toBeNull();

    manager.dispose();
    expect(readStoredStats()).toEqual({
      currentPuzzle: 2,
      bestStreak: 1,
      history: [{ p: 1, t: Date.parse("2026-01-01T00:00:00.000Z"), ms: 12000, ok: true }],
      retries: {},
    });

    const externalWrite = {
      currentPuzzle: 7,
      bestStreak: 4,
      history: [{ p: 4, t: 300, ms: 9000, ok: true }],
      retries: {},
    };
    localStorage.setItem(StatsManager.STORAGE_KEY, JSON.stringify(externalWrite));

    vi.advanceTimersByTime(StatsManager.DEBOUNCE_MS + 1);
    expect(readStoredStats()).toEqual(externalWrite);
  });

  it("supports provider updates without recreating manager state", () => {
    const providerA: PuzzleDataProvider = {
      getMateIn(): number {
        return 1;
      },
      getTotalCount(): number {
        return 5;
      },
    };
    const providerB: PuzzleDataProvider = {
      getMateIn(): number {
        return 2;
      },
      getTotalCount(): number {
        return 5;
      },
    };

    const manager = new StatsManager(providerA);
    manager.recordAttempt(1, 12000, true);
    manager.setPuzzleDataProvider(providerB);

    expect(manager.getStatsByType(1).solved).toBe(0);
    expect(manager.getStatsByType(2).solved).toBe(1);
    manager.dispose();
  });

  it("loads persisted data and restores retries with puzzle id", () => {
    localStorage.setItem(
      StatsManager.STORAGE_KEY,
      JSON.stringify({
        currentPuzzle: 9,
        bestStreak: 4,
        history: [{ p: 7, t: 100, ms: 8000, ok: false }],
        retries: {
          7: [{ t: 200, ms: 3000, ok: true }],
        },
      }),
    );

    const manager = new StatsManager(provider);
    manager.load();

    expect(manager.getCurrentPuzzle()).toBe(9);
    expect(manager.getBestStreak()).toBe(4);
    expect(manager.history[0]?.puzzleId).toBe(7);
    expect(manager.retries.get(7)?.[0]?.puzzleId).toBe(7);
    expect(manager.getPuzzleStats(7).solved).toBe(true);
    manager.dispose();
  });

  it("ignores unknown puzzle ids while loading persisted data", () => {
    const strictProvider: PuzzleDataProvider = {
      getMateIn(puzzleId: number): number {
        if (puzzleId < 1 || puzzleId > 3) {
          throw new Error(`Unknown puzzle id: ${puzzleId}`);
        }
        return puzzleId;
      },
      getTotalCount(): number {
        return 3;
      },
    };

    localStorage.setItem(
      StatsManager.STORAGE_KEY,
      JSON.stringify({
        currentPuzzle: 99,
        bestStreak: 2,
        history: [
          { p: 2, t: 100, ms: 8000, ok: false },
          { p: 99, t: 101, ms: 9000, ok: true },
        ],
        retries: {
          2: [{ t: 200, ms: 4000, ok: false }],
          99: [{ t: 300, ms: 3000, ok: true }],
        },
      }),
    );

    const manager = new StatsManager(strictProvider);
    manager.load();

    expect(manager.getCurrentPuzzle()).toBe(3);
    expect(manager.history).toHaveLength(1);
    expect(manager.history[0]?.puzzleId).toBe(2);
    expect(manager.retries.has(99)).toBe(false);
    expect(() => manager.getRetryQueue()).not.toThrow();
    expect(manager.getRetryQueue()).toEqual([
      { puzzleId: 2, mateIn: 2, missCount: 2, lastAttemptAt: 200 },
    ]);
    manager.dispose();
  });

  it("resets to defaults when stored payload is corrupt", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(StatsManager.STORAGE_KEY, "{ invalid json");

    const manager = new StatsManager(provider);
    manager.load();

    expect(manager.getCurrentPuzzle()).toBe(1);
    expect(manager.getBestStreak()).toBe(0);
    expect(manager.history).toEqual([]);
    expect(manager.retries.size).toBe(0);
    expect(readStoredStats()).toEqual({
      currentPuzzle: 1,
      bestStreak: 0,
      history: [],
      retries: {},
    });

    errorSpy.mockRestore();
    manager.dispose();
  });

  it("reset clears progress and saves immediately", () => {
    const manager = new StatsManager(provider);

    manager.recordAttempt(1, 12000, true);
    manager.reset();

    expect(manager.getCurrentPuzzle()).toBe(1);
    expect(manager.getBestStreak()).toBe(0);
    expect(manager.history).toEqual([]);
    expect(manager.retries.size).toBe(0);
    expect(readStoredStats()).toEqual({
      currentPuzzle: 1,
      bestStreak: 0,
      history: [],
      retries: {},
    });
    manager.dispose();
  });

  it("returns null trend when first sample average is zero", () => {
    const typeOneProvider: PuzzleDataProvider = {
      getMateIn(): number {
        return 1;
      },
      getTotalCount(): number {
        return 10;
      },
    };
    const manager = new StatsManager(typeOneProvider);

    for (let puzzleId = 1; puzzleId <= 5; puzzleId += 1) {
      manager.recordAttempt(puzzleId, 0, true);
      vi.advanceTimersByTime(10);
    }
    for (let puzzleId = 6; puzzleId <= 10; puzzleId += 1) {
      manager.recordAttempt(puzzleId, 5000, true);
      vi.advanceTimersByTime(10);
    }

    expect(manager.getStatsByType(1).trend).toBeNull();
    manager.dispose();
  });
});
