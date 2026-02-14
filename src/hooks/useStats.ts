import { useCallback, useEffect, useMemo, useReducer } from "react";
import { StatsManager, type PuzzleDataProvider } from "@/lib/stats-manager";

export interface UseStatsResult {
  manager: StatsManager;
  recordAttempt: (puzzleId: number, timeMs: number, success: boolean) => void;
  reset: () => void;
  solved: number;
  retryQueue: ReturnType<StatsManager["getRetryQueue"]>;
  currentStreak: number;
  bestStreak: number;
  successRate: number;
  currentPuzzle: number;
  totalPuzzles: number;
  typeStats: ReturnType<StatsManager["getAllTypeStats"]>;
}

export function useStats(puzzleData: PuzzleDataProvider): UseStatsResult {
  const manager = useMemo(() => {
    const nextManager = new StatsManager(puzzleData);
    nextManager.load();
    return nextManager;
  }, [puzzleData]);

  const [, forceUpdate] = useReducer((count: number) => count + 1, 0);

  useEffect(
    () => () => {
      manager.save();
      manager.dispose();
    },
    [manager],
  );

  const recordAttempt = useCallback(
    (puzzleId: number, timeMs: number, success: boolean) => {
      manager.recordAttempt(puzzleId, timeMs, success);
      manager.save();
      forceUpdate();
    },
    [manager],
  );

  const reset = useCallback(() => {
    manager.reset();
    forceUpdate();
  }, [manager]);

  return {
    manager,
    recordAttempt,
    reset,
    solved: manager.getSolved(),
    retryQueue: manager.getRetryQueue(),
    currentStreak: manager.getCurrentStreak(),
    bestStreak: manager.getBestStreak(),
    successRate: manager.getSuccessRate(),
    currentPuzzle: manager.getCurrentPuzzle(),
    totalPuzzles: manager.getTotalPuzzles(),
    typeStats: manager.getAllTypeStats(),
  };
}
