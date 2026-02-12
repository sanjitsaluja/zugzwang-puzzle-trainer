import { useCallback, useSyncExternalStore } from "react";
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
} {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const stats = computeStats(state.puzzles);

  const updatePuzzle = useCallback(
    (id: number, update: Partial<PuzzleState>) => {
      const prev = state.puzzles[id] ?? defaultPuzzleState();
      setState({
        ...state,
        puzzles: { ...state.puzzles, [id]: { ...prev, ...update } },
      });
    },
    [state],
  );

  const setCurrentPuzzleId = useCallback(
    (id: number) => {
      setState({ ...state, currentPuzzleId: id });
    },
    [state],
  );

  const setEngineEnabled = useCallback(
    (enabled: boolean) => {
      setState({
        ...state,
        settings: { ...state.settings, engineEnabled: enabled },
      });
    },
    [state],
  );

  return { state, stats, updatePuzzle, setCurrentPuzzleId, setEngineEnabled };
}
