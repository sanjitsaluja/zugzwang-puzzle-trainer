import {
  type AppSettings,
  AppSettingsSchema,
  type AppState,
  AppStateSchema,
  type DerivedStats,
  type PuzzleState,
} from "@/types";

export const PROGRESS_STORAGE_KEY = "zugzwang-progress";
export const SETTINGS_STORAGE_KEY = "zugzwang-settings";

const SCHEMA_VERSION = 1;
const AppProgressSchema = AppStateSchema.pick({
  currentPuzzleId: true,
  puzzles: true,
});

type AppProgress = {
  currentPuzzleId: AppState["currentPuzzleId"];
  puzzles: AppState["puzzles"];
};

interface StoredEnvelope {
  version: number;
  data: unknown;
}

interface StoredProgress {
  version: number;
  data: AppProgress;
}

export function defaultAppSettings(): AppSettings {
  return {
    overallTheme: "auto",
    pieceSet: "cburnett",
    boardTheme: "brown",
    coordinates: true,
    showLegalMoves: true,
    highlightLastMove: true,
    animationSpeed: 200,
    timer: true,
    soundEffects: true,
    autoAdvanceToNextPuzzle: false,
  };
}

function defaultProgressState(): AppProgress {
  return {
    currentPuzzleId: 1,
    puzzles: {},
  };
}

export function defaultAppState(): AppState {
  return {
    ...defaultProgressState(),
    settings: defaultAppSettings(),
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
  const progress = loadProgressState();
  const settings = loadSettingsState();

  return {
    ...progress,
    settings,
  };
}

export function saveAppState(state: AppState): void {
  const storedProgress: StoredProgress = {
    version: SCHEMA_VERSION,
    data: {
      currentPuzzleId: state.currentPuzzleId,
      puzzles: state.puzzles,
    },
  };

  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(storedProgress));
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
}

export function clearAppState(): void {
  localStorage.removeItem(PROGRESS_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
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

function isStoredEnvelope(value: unknown): value is StoredEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj["version"] === "number" && typeof obj["data"] === "object";
}

function parseSettings(value: unknown): AppSettings | null {
  if (typeof value !== "object" || value === null) return null;

  const result = AppSettingsSchema.safeParse({
    ...defaultAppSettings(),
    ...(value as Record<string, unknown>),
  });

  if (!result.success) return null;
  return result.data;
}

function loadProgressState(): AppProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw === null) return defaultProgressState();

    const stored: unknown = JSON.parse(raw);
    if (!isStoredEnvelope(stored)) return defaultProgressState();
    if (stored.version !== SCHEMA_VERSION) return defaultProgressState();

    const result = AppProgressSchema.safeParse(stored.data);
    if (!result.success) return defaultProgressState();

    return result.data;
  } catch {
    return defaultProgressState();
  }
}

function loadSettingsState(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return defaultAppSettings();

    const stored: unknown = JSON.parse(raw);
    return parseSettings(stored) ?? defaultAppSettings();
  } catch {
    return defaultAppSettings();
  }
}
