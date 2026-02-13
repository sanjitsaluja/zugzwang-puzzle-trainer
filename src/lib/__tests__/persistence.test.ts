import { afterEach, describe, expect, it } from "vitest";
import {
  clearAppState,
  computeStats,
  defaultAppState,
  defaultPuzzleState,
  loadAppState,
  saveAppState,
} from "../persistence";
import type { AppState, PuzzleState } from "@/types";

afterEach(() => {
  clearAppState();
});

// ---------------------------------------------------------------------------
// defaultAppState / defaultPuzzleState
// ---------------------------------------------------------------------------

describe("defaults", () => {
  it("returns default app state", () => {
    const state = defaultAppState();
    expect(state.currentPuzzleId).toBe(1);
    expect(state.puzzles).toEqual({});
    expect(state.settings.engineEnabled).toBe(true);
  });

  it("returns default puzzle state", () => {
    const ps = defaultPuzzleState();
    expect(ps.status).toBe("unattempted");
    expect(ps.timeMs).toBeNull();
    expect(ps.attempts).toBe(0);
    expect(ps.successCount).toBe(0);
    expect(ps.failCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// save / load round-trip
// ---------------------------------------------------------------------------

describe("save and load", () => {
  it("round-trips AppState through localStorage", () => {
    const state: AppState = {
      currentPuzzleId: 42,
      puzzles: {
        1: { status: "success", timeMs: 5000, attempts: 1, successCount: 1, failCount: 0 },
        2: { status: "fail", timeMs: 12000, attempts: 3, successCount: 1, failCount: 2 },
      },
      settings: { engineEnabled: false },
    };

    saveAppState(state);
    const loaded = loadAppState();

    expect(loaded).toEqual(state);
  });

  it("returns default state when localStorage is empty", () => {
    const loaded = loadAppState();
    expect(loaded).toEqual(defaultAppState());
  });

  it("returns default state for corrupted data", () => {
    localStorage.setItem("zugzwang-state", "not json");
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default state for invalid schema", () => {
    localStorage.setItem("zugzwang-state", JSON.stringify({ foo: "bar" }));
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("resets on schema version mismatch", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({ version: 0, data: { currentPuzzleId: 99 } }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default state when data has correct version but invalid AppState shape", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({ version: 1, data: { garbage: true } }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default state when puzzles contain invalid status", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 1,
          puzzles: {
            1: {
              status: "INVALID",
              timeMs: null,
              attempts: 0,
              successCount: 0,
              failCount: 0,
            },
          },
          settings: { engineEnabled: true },
        },
      }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default state when settings shape is wrong", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 1,
          puzzles: {},
          settings: { engineEnabled: "not-a-boolean" },
        },
      }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });
});

// ---------------------------------------------------------------------------
// clearAppState
// ---------------------------------------------------------------------------

describe("clearAppState", () => {
  it("removes stored state", () => {
    saveAppState(defaultAppState());
    clearAppState();
    expect(localStorage.getItem("zugzwang-state")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------

describe("computeStats", () => {
  it("returns zeros for empty puzzles", () => {
    const stats = computeStats({});
    expect(stats.totalAttempted).toBe(0);
    expect(stats.totalSolved).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.averageSolveTimeMs).toBeNull();
  });

  it("ignores unattempted puzzles", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0 },
      2: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0 },
    };
    const stats = computeStats(puzzles);
    expect(stats.totalAttempted).toBe(0);
  });

  it("computes correct stats for mixed results", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "success", timeMs: 4000, attempts: 1, successCount: 1, failCount: 0 },
      2: { status: "success", timeMs: 6000, attempts: 1, successCount: 1, failCount: 0 },
      3: { status: "fail", timeMs: 10000, attempts: 2, successCount: 1, failCount: 1 },
      4: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0 },
    };
    const stats = computeStats(puzzles);

    expect(stats.totalAttempted).toBe(3);
    expect(stats.totalSolved).toBe(2);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.averageSolveTimeMs).toBe(5000);
  });

  it("handles success with null timeMs", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "success", timeMs: null, attempts: 1, successCount: 1, failCount: 0 },
    };
    const stats = computeStats(puzzles);
    expect(stats.totalSolved).toBe(1);
    expect(stats.averageSolveTimeMs).toBeNull();
  });

  it("loads old puzzle states without miss counters by filling defaults", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 3,
          puzzles: {
            3: { status: "fail", timeMs: 7000, attempts: 2 },
          },
          settings: { engineEnabled: true },
        },
      }),
    );

    const loaded = loadAppState();
    expect(loaded.puzzles[3]).toEqual({
      status: "fail",
      timeMs: 7000,
      attempts: 2,
      successCount: 0,
      failCount: 0,
    });
  });
});
