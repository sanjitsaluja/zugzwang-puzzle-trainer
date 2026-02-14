import { type AppState, type DerivedStats, type PuzzleState, AppStateSchema } from "@/types";

const STORAGE_KEY = "zugzwang-state";
const SCHEMA_VERSION = 1;

interface StoredState {
  version: number;
  data: AppState;
}

export function defaultAppState(): AppState {
  return {
    currentPuzzleId: 1,
    puzzles: {},
    settings: {
      engineEnabled: true,
    },
  };
}

export function defaultPuzzleState(): PuzzleState {
  return {
    status: "unattempted",
    timeMs: null,
    attempts: 0,
    successCount: 0,
    failCount: 0,
    hintCount: 0,
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultAppState();

    const stored: unknown = JSON.parse(raw);
    if (!isStoredState(stored)) return defaultAppState();
    if (stored.version !== SCHEMA_VERSION) return migrateState(stored);

    const result = AppStateSchema.safeParse(stored.data);
    if (!result.success) return defaultAppState();

    return result.data;
  } catch {
    return defaultAppState();
  }
}

export function saveAppState(state: AppState): void {
  const stored: StoredState = {
    version: SCHEMA_VERSION,
    data: state,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearAppState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function computeStats(puzzles: Record<number, PuzzleState>): DerivedStats {
  const entries = Object.values(puzzles);
  const attempted = entries.filter((p) => p.status !== "unattempted");
  const solved = entries.filter((p) => p.status === "success");

  const solveTimes = solved
    .map((p) => p.timeMs)
    .filter((t): t is number => t !== null);

  const totalAttempted = attempted.length;
  const totalSolved = solved.length;
  const totalHintsUsed = entries.reduce((sum, puzzle) => sum + puzzle.hintCount, 0);

  return {
    totalAttempted,
    totalSolved,
    successRate: totalAttempted > 0 ? totalSolved / totalAttempted : 0,
    averageSolveTimeMs:
      solveTimes.length > 0
        ? solveTimes.reduce((sum, t) => sum + t, 0) / solveTimes.length
        : null,
    totalHintsUsed,
  };
}

function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj["version"] === "number" && typeof obj["data"] === "object";
}

function migrateState(_stored: StoredState): AppState {
  return defaultAppState();
}
