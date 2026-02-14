import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AppState, DerivedStats, PuzzleState } from "@/types";
import {
  computeStats,
  defaultPuzzleState,
  loadAppState,
  saveAppState,
} from "@/lib/persistence";

let currentState: AppState = loadAppState();
const listeners = new Set<() => void>();

function getSnapshot(): AppState {
  return currentState;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function setState(next: AppState): void {
  currentState = next;
  saveAppState(next);
  for (const listener of listeners) listener();
}

export function useAppState(): {
  state: AppState;
  stats: DerivedStats;
  updatePuzzle: (id: number, update: Partial<PuzzleState>) => void;
  setCurrentPuzzleId: (id: number) => void;
  setEngineEnabled: (enabled: boolean) => void;
  resetPuzzleStats: () => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const stats = useMemo(() => computeStats(state.puzzles), [state.puzzles]);

  const updatePuzzle = useCallback(
    (id: number, update: Partial<PuzzleState>) => {
      const current = currentState;
      const prev = current.puzzles[id] ?? defaultPuzzleState();
      setState({
        ...current,
        puzzles: { ...current.puzzles, [id]: { ...prev, ...update } },
      });
    },
    [],
  );

  const setCurrentPuzzleId = useCallback((id: number) => {
    setState({ ...currentState, currentPuzzleId: id });
  }, []);

  const setEngineEnabled = useCallback((enabled: boolean) => {
    setState({
      ...currentState,
      settings: { ...currentState.settings, engineEnabled: enabled },
    });
  }, []);

  const resetPuzzleStats = useCallback(() => {
    setState({
      ...currentState,
      puzzles: {},
    });
  }, []);

  return {
    state,
    stats,
    updatePuzzle,
    setCurrentPuzzleId,
    setEngineEnabled,
    resetPuzzleStats,
  };
}
