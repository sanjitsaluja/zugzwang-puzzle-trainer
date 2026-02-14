import { afterEach, describe, expect, it } from "vitest";
import {
  clearAppState,
  computeStats,
  defaultAppSettings,
  defaultAppState,
  defaultPuzzleState,
  loadAppState,
  PROGRESS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
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
  it("returns default app settings", () => {
    expect(defaultAppSettings()).toEqual({
      pieceSet: "cburnett",
      boardTheme: "brown",
      coordinates: true,
      showLegalMoves: true,
      highlightLastMove: true,
      animationSpeed: 200,
      timer: true,
      soundEffects: true,
    });
  });

  it("returns default app state", () => {
    const state = defaultAppState();
    expect(state.currentPuzzleId).toBe(1);
    expect(state.puzzles).toEqual({});
    expect(state.settings).toEqual(defaultAppSettings());
  });

  it("returns default puzzle state", () => {
    const ps = defaultPuzzleState();
    expect(ps.status).toBe("unattempted");
    expect(ps.timeMs).toBeNull();
    expect(ps.attempts).toBe(0);
    expect(ps.successCount).toBe(0);
    expect(ps.failCount).toBe(0);
    expect(ps.hintCount).toBe(0);
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
        1: { status: "success", timeMs: 5000, attempts: 1, successCount: 1, failCount: 0, hintCount: 1 },
        2: { status: "fail", timeMs: 12000, attempts: 3, successCount: 1, failCount: 2, hintCount: 2 },
      },
      settings: {
        pieceSet: "merida",
        boardTheme: "green",
        coordinates: false,
        showLegalMoves: false,
        highlightLastMove: false,
        animationSpeed: 0,
        timer: false,
        soundEffects: false,
      },
    };

    saveAppState(state);
    const loaded = loadAppState();

    expect(loaded).toEqual(state);
  });

  it("writes progress and settings to separate keys", () => {
    const state = defaultAppState();
    saveAppState(state);

    const progressRaw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    expect(progressRaw).not.toBeNull();
    expect(settingsRaw).not.toBeNull();
  });

  it("returns default state when localStorage is empty", () => {
    const loaded = loadAppState();
    expect(loaded).toEqual(defaultAppState());
  });

  it("falls back to default progress when progress storage is corrupted", () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, "{ invalid json");
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        pieceSet: "alpha",
        boardTheme: "gray",
        coordinates: false,
        showLegalMoves: false,
        highlightLastMove: false,
        animationSpeed: 100,
        timer: false,
        soundEffects: false,
      }),
    );

    const loaded = loadAppState();
    expect(loaded.currentPuzzleId).toBe(1);
    expect(loaded.puzzles).toEqual({});
    expect(loaded.settings.pieceSet).toBe("alpha");
  });

  it("falls back to default settings when settings storage is invalid", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 10,
          puzzles: {},
        },
      }),
    );
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        pieceSet: "not-a-piece-set",
      }),
    );

    const loaded = loadAppState();
    expect(loaded.currentPuzzleId).toBe(10);
    expect(loaded.settings).toEqual(defaultAppSettings());
  });

  it("resets progress on progress schema version mismatch", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 0, data: { currentPuzzleId: 99 } }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default state when progress shape is invalid", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, data: { garbage: true } }),
    );
    expect(loadAppState()).toEqual(defaultAppState());
  });

  it("returns default progress when puzzle status is invalid", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
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
              hintCount: 0,
            },
          },
        },
      }),
    );
    const loaded = loadAppState();
    expect(loaded.currentPuzzleId).toBe(1);
    expect(loaded.puzzles).toEqual({});
    expect(loaded.settings).toEqual(defaultAppSettings());
  });

  it("ignores obsolete legacy storage key", () => {
    localStorage.setItem(
      "zugzwang-state",
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 7,
          puzzles: { 7: { status: "success", timeMs: 5000, attempts: 1 } },
          settings: { pieceSet: "staunty" },
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
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
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
    expect(stats.totalHintsUsed).toBe(0);
  });

  it("ignores unattempted puzzles", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0, hintCount: 0 },
      2: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0, hintCount: 0 },
    };
    const stats = computeStats(puzzles);
    expect(stats.totalAttempted).toBe(0);
  });

  it("computes correct stats for mixed results", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "success", timeMs: 4000, attempts: 1, successCount: 1, failCount: 0, hintCount: 1 },
      2: { status: "success", timeMs: 6000, attempts: 1, successCount: 1, failCount: 0, hintCount: 2 },
      3: { status: "fail", timeMs: 10000, attempts: 2, successCount: 1, failCount: 1, hintCount: 3 },
      4: { status: "unattempted", timeMs: null, attempts: 0, successCount: 0, failCount: 0, hintCount: 0 },
    };
    const stats = computeStats(puzzles);

    expect(stats.totalAttempted).toBe(3);
    expect(stats.totalSolved).toBe(2);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.averageSolveTimeMs).toBe(5000);
    expect(stats.totalHintsUsed).toBe(6);
  });

  it("handles success with null timeMs", () => {
    const puzzles: Record<number, PuzzleState> = {
      1: { status: "success", timeMs: null, attempts: 1, successCount: 1, failCount: 0, hintCount: 1 },
    };
    const stats = computeStats(puzzles);
    expect(stats.totalSolved).toBe(1);
    expect(stats.averageSolveTimeMs).toBeNull();
  });

  it("loads old progress states without miss counters by filling defaults", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          currentPuzzleId: 3,
          puzzles: {
            3: { status: "fail", timeMs: 7000, attempts: 2 },
          },
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
      hintCount: 0,
    });
  });
});
