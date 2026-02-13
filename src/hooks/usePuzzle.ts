import { useCallback, useEffect, useRef, useState } from "react";
import { PuzzleEngine } from "@/lib/puzzle-engine";
import type { MoveRecord } from "@/lib/puzzle-engine";
import { useTimer } from "./useTimer";
import { useAppState } from "./useAppState";
import { useStockfish } from "./useStockfish";
import { getPuzzleById, loadPuzzles, parseMoves } from "@/lib/puzzles";
import type {
  BoardColor,
  GamePhase,
  GetOpponentMoveFn,
  ParsedMove,
  PuzzleData,
  PuzzleStrategy,
  ValidateMoveFn,
} from "@/types";

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

function createSolutionStrategy(solution: ParsedMove[]): PuzzleStrategy {
  let solutionIndex = 0;

  const validateMove: ValidateMoveFn = async (_fen, userMove, _remainingMateDepth) => {
    const expected = solution[solutionIndex];
    const isCorrect =
      expected !== undefined &&
      expected.from === userMove.from &&
      expected.to === userMove.to &&
      (expected.promotion === undefined || expected.promotion === userMove.promotion);

    solutionIndex++;

    if (!isCorrect) {
      return { isCorrect: false, opponentMove: null };
    }

    const opponentMove = solution[solutionIndex] ?? null;
    if (opponentMove) solutionIndex++;

    return { isCorrect: true, opponentMove };
  };

  const getOpponentMove: GetOpponentMoveFn = async () => null;

  return {
    validateMove,
    getOpponentMove,
    freePlayBothSides: true,
  };
}

export type { MoveRecord };

export function usePuzzle() {
  const { state, updatePuzzle, setCurrentPuzzleId } = useAppState();
  const timer = useTimer();
  const stockfish = useStockfish();

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

  const stockfishRef = useRef(stockfish);
  stockfishRef.current = stockfish;

  const engineSettled =
    !state.settings.engineEnabled ||
    stockfish.status === "ready" ||
    stockfish.status === "error";

  useEffect(() => {
    if (!puzzles || !engineSettled) return;
    const puzzle = getPuzzleById(puzzles, state.currentPuzzleId);
    if (!puzzle) return;

    const solution = parseMoves(puzzle.moves);
    const sf = stockfishRef.current;
    const useEngine = state.settings.engineEnabled && sf.status === "ready";

    const strategy: PuzzleStrategy = useEngine
      ? sf.createEngineStrategy(solution)
      : createSolutionStrategy(solution);

    console.log(`[usePuzzle] Loading puzzle #${puzzle.problemid} (${puzzle.type}), strategy=${useEngine ? "engine" : "solution"}`);
    engineRef.current?.loadPuzzle(puzzle, strategy);
  }, [puzzles, state.currentPuzzleId, state.settings.engineEnabled, engineSettled]);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    engineRef.current?.makeMove(from, to, promotion).catch((err: unknown) => {
      console.error("Move processing failed:", err);
    });
  }, []);

  const isLastPuzzle = state.currentPuzzleId >= TOTAL_PUZZLES;

  const nextPuzzle = useCallback(() => {
    if (snapshot.phase !== "complete") return;
    if (state.currentPuzzleId >= TOTAL_PUZZLES) return;
    setCurrentPuzzleId(state.currentPuzzleId + 1);
  }, [snapshot.phase, state.currentPuzzleId, setCurrentPuzzleId]);

  const previousPuzzle = useCallback(() => {
    if (state.currentPuzzleId <= 1) return;
    setCurrentPuzzleId(state.currentPuzzleId - 1);
  }, [state.currentPuzzleId, setCurrentPuzzleId]);

  const goToPuzzle = useCallback(
    (puzzleId: number) => {
      const clampedId = Math.max(1, Math.min(TOTAL_PUZZLES, puzzleId));
      if (clampedId === state.currentPuzzleId) return;
      setCurrentPuzzleId(clampedId);
    },
    [state.currentPuzzleId, setCurrentPuzzleId],
  );

  return {
    ...snapshot,
    currentPuzzleId: state.currentPuzzleId,
    elapsedMs: timer.elapsedMs,
    formattedTime: timer.formatted,
    makeMove,
    nextPuzzle,
    previousPuzzle,
    goToPuzzle,
    isLastPuzzle,
    loadError,
    isLoading: (puzzles === null && loadError === null) || !engineSettled,
    engineStatus: stockfish.status,
    engineError: stockfish.error,
  };
}
