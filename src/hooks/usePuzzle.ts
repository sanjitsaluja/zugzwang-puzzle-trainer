import { useCallback, useEffect, useRef, useState } from "react";
import { PuzzleEngine } from "@/lib/puzzle-engine";
import type { MoveRecord } from "@/lib/puzzle-engine";
import { useTimer } from "./useTimer";
import { useAppState } from "./useAppState";
import { getPuzzleById, loadPuzzles } from "@/lib/puzzles";
import type { BoardColor, GamePhase, PuzzleData } from "@/types";
import { TOTAL_PUZZLES } from "@/types";

interface PuzzleSnapshot {
  phase: GamePhase;
  fen: string;
  orientation: BoardColor;
  turnColor: BoardColor;
  dests: Map<string, string[]>;
  lastMove: [string, string] | undefined;
  isFailed: boolean;
  isInteractive: boolean;
  isCheck: boolean;
  moveHistory: MoveRecord[];
  puzzleData: PuzzleData | null;
}

function takeSnapshot(engine: PuzzleEngine): PuzzleSnapshot {
  return {
    phase: engine.phase,
    fen: engine.fen,
    orientation: engine.orientation,
    turnColor: engine.turnColor,
    dests: engine.dests,
    lastMove: engine.lastMove,
    isFailed: engine.isFailed,
    isInteractive: engine.isInteractive,
    isCheck: engine.isCheck,
    moveHistory: engine.moveHistory,
    puzzleData: engine.puzzleData,
  };
}

export type { MoveRecord };

export function usePuzzle() {
  const { state, updatePuzzle, setCurrentPuzzleId } = useAppState();
  const timer = useTimer();

  const [puzzles, setPuzzles] = useState<PuzzleData[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PuzzleSnapshot>({
    phase: "loading",
    fen: "",
    orientation: "white",
    turnColor: "white",
    dests: new Map(),
    lastMove: undefined,
    isFailed: false,
    isInteractive: false,
    isCheck: false,
    moveHistory: [],
    puzzleData: null,
  });

  const engineRef = useRef<PuzzleEngine>(null);
  if (engineRef.current === null) {
    engineRef.current = new PuzzleEngine(() => {
      setSnapshot(takeSnapshot(engineRef.current!));
    });
  }

  const prevPhaseRef = useRef<GamePhase>("loading");
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const updatePuzzleRef = useRef(updatePuzzle);
  updatePuzzleRef.current = updatePuzzle;

  useEffect(() => {
    const phase = snapshot.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === "playing" && prev === "loading") {
      timerRef.current.reset();
      timerRef.current.start();
    } else if (phase === "complete" && prev !== "complete") {
      const finalMs = timerRef.current.stop();
      const puzzleData = snapshot.puzzleData;
      if (puzzleData) {
        updatePuzzleRef.current(puzzleData.problemid, {
          status: snapshot.isFailed ? "fail" : "success",
          timeMs: finalMs,
          attempts: (state.puzzles[puzzleData.problemid]?.attempts ?? 0) + 1,
        });
      }
    }
  }, [snapshot.phase, snapshot.puzzleData, snapshot.isFailed, state.puzzles]);

  useEffect(() => {
    loadPuzzles()
      .then(setPuzzles)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load puzzles");
      });
  }, []);

  useEffect(() => {
    if (!puzzles) return;
    const puzzle = getPuzzleById(puzzles, state.currentPuzzleId);
    if (puzzle) {
      engineRef.current?.loadPuzzle(puzzle);
    }
  }, [puzzles, state.currentPuzzleId]);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    engineRef.current?.makeMove(from, to, promotion);
  }, []);

  const isLastPuzzle = state.currentPuzzleId >= TOTAL_PUZZLES;

  const nextPuzzle = useCallback(() => {
    if (snapshot.phase !== "complete") return;
    if (state.currentPuzzleId >= TOTAL_PUZZLES) return;
    setCurrentPuzzleId(state.currentPuzzleId + 1);
  }, [snapshot.phase, state.currentPuzzleId, setCurrentPuzzleId]);

  return {
    ...snapshot,
    elapsedMs: timer.elapsedMs,
    formattedTime: timer.formatted,
    makeMove,
    nextPuzzle,
    isLastPuzzle,
    loadError,
    isLoading: puzzles === null && loadError === null,
  };
}
