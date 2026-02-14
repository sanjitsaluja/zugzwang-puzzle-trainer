import { useCallback, useEffect, useRef, useState } from "react";
import { PuzzleEngine } from "@/lib/puzzle-engine";
import type { FeedbackEvent, MoveRecord, PuzzleResumeState } from "@/lib/puzzle-engine";
import { useTimer } from "./useTimer";
import { useAppState } from "./useAppState";
import { useStockfish } from "./useStockfish";
import { getPuzzleById, loadPuzzles, parseMoves } from "@/lib/puzzles";
import type {
  BoardColor,
  GamePhase,
  GetOpponentMoveFn,
  ParsedMove,
  PromotionPiece,
  PuzzleState,
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
  feedbackEvent: FeedbackEvent | null;
}

type HintStep = 0 | 1 | 2;

interface PuzzleSession {
  engineState: PuzzleResumeState;
  timerMs: number;
  isTimerRunning: boolean;
  hintStep: HintStep;
  hintMove: ParsedMove | null;
}

interface PuzzleCompletionEvent {
  puzzleId: number;
  timeMs: number;
  success: boolean;
}

interface PuzzleFailureEvent {
  puzzleId: number;
  timeMs: number;
}

interface UsePuzzleOptions {
  onPuzzleFailed?: (event: PuzzleFailureEvent) => void;
  onPuzzleComplete?: (event: PuzzleCompletionEvent) => void;
}

export function buildFailureProgressUpdate(
  previous: PuzzleState | undefined,
): Partial<PuzzleState> {
  return {
    status: "fail",
    failCount: (previous?.failCount ?? 0) + 1,
  };
}

export function buildCompletionProgressUpdate(
  previous: PuzzleState | undefined,
  wasSuccess: boolean,
  finalMs: number,
): Partial<PuzzleState> {
  return {
    status: wasSuccess ? "success" : "fail",
    timeMs: finalMs,
    attempts: (previous?.attempts ?? 0) + 1,
    successCount: (previous?.successCount ?? 0) + (wasSuccess ? 1 : 0),
    failCount: previous?.failCount ?? 0,
  };
}

export function buildHintProgressUpdate(
  previous: PuzzleState | undefined,
): Partial<PuzzleState> {
  return {
    hintCount: (previous?.hintCount ?? 0) + 1,
  };
}

function countPlies(moveHistory: MoveRecord[]): number {
  return moveHistory.reduce(
    (plyCount, record) => plyCount + 1 + (record.opponentMove ? 1 : 0),
    0,
  );
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
    feedbackEvent: engine.feedbackEvent,
  };
}

function createSolutionStrategy(
  solution: ParsedMove[],
  options?: {
    initialSolutionIndex?: number;
    onSolutionIndexChange?: (index: number) => void;
  },
): PuzzleStrategy {
  let solutionIndex = options?.initialSolutionIndex ?? 0;
  const setSolutionIndex = (next: number) => {
    solutionIndex = next;
    options?.onSolutionIndexChange?.(next);
  };

  const validateMove: ValidateMoveFn = async (_fen, userMove, remainingMateDepth) => {
    void remainingMateDepth;
    const expected = solution[solutionIndex];
    const isCorrect =
      expected !== undefined &&
      expected.from === userMove.from &&
      expected.to === userMove.to &&
      (expected.promotion === undefined || expected.promotion === userMove.promotion);

    setSolutionIndex(solutionIndex + 1);

    if (!isCorrect) {
      return { isCorrect: false, opponentMove: null };
    }

    const opponentMove = solution[solutionIndex] ?? null;
    if (opponentMove) setSolutionIndex(solutionIndex + 1);

    return { isCorrect: true, opponentMove };
  };

  const getOpponentMove: GetOpponentMoveFn = async () => solution[solutionIndex] ?? null;

  return {
    validateMove,
    getOpponentMove,
    freePlayBothSides: true,
  };
}

export type { MoveRecord };

export function usePuzzle(options: UsePuzzleOptions = {}) {
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
    feedbackEvent: null,
  });
  const [hintStep, setHintStep] = useState<HintStep>(0);
  const [hintMove, setHintMove] = useState<ParsedMove | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  const engineRef = useRef<PuzzleEngine>(null);
  if (engineRef.current === null) {
    engineRef.current = new PuzzleEngine(() => {
      setSnapshot(takeSnapshot(engineRef.current!));
    });
  }

  const prevPhaseRef = useRef<GamePhase>("loading");
  const prevIsFailedRef = useRef(false);
  const sessionByPuzzleIdRef = useRef<Map<number, PuzzleSession>>(new Map());
  const pendingLoadContextRef = useRef<{
    timerMs: number;
    isTimerRunning: boolean;
    hintStep: HintStep;
    hintMove: ParsedMove | null;
  } | null>(null);
  const isHydratingRef = useRef(false);
  const hintRequestIdRef = useRef(0);
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const updatePuzzleRef = useRef(updatePuzzle);
  updatePuzzleRef.current = updatePuzzle;
  const onPuzzleFailedRef = useRef(options.onPuzzleFailed);
  onPuzzleFailedRef.current = options.onPuzzleFailed;
  const onPuzzleCompleteRef = useRef(options.onPuzzleComplete);
  onPuzzleCompleteRef.current = options.onPuzzleComplete;

  const clearHintState = useCallback(() => {
    hintRequestIdRef.current += 1;
    setHintStep(0);
    setHintMove(null);
    setIsHintLoading(false);
  }, []);

  const persistSession = useCallback(
    (
      puzzleId: number,
      nextSnapshot: PuzzleSnapshot,
      timerMs: number,
      isTimerRunning: boolean,
      nextHintStep: HintStep,
      nextHintMove: ParsedMove | null,
    ) => {
      if (nextSnapshot.phase === "loading") return;

      const phase: PuzzleResumeState["phase"] =
        nextSnapshot.phase === "complete" ? "complete" : "playing";

      sessionByPuzzleIdRef.current.set(puzzleId, {
        engineState: {
          fen: nextSnapshot.fen,
          phase,
          isFailed: nextSnapshot.isFailed,
          moveHistory: nextSnapshot.moveHistory,
          lastMove: nextSnapshot.lastMove,
        },
        timerMs,
        isTimerRunning: phase === "complete" ? false : isTimerRunning,
        hintStep: phase === "complete" ? 0 : nextHintStep,
        hintMove: phase === "complete" ? null : nextHintMove,
      });
    },
    [],
  );

  const persistCurrentSession = useCallback(() => {
    const puzzleData = snapshot.puzzleData;
    if (!puzzleData) return;
    persistSession(
      puzzleData.problemid,
      snapshot,
      timer.elapsedMs,
      timer.isRunning,
      hintStep,
      hintMove,
    );
  }, [hintMove, hintStep, persistSession, snapshot, timer.elapsedMs, timer.isRunning]);

  useEffect(() => {
    const puzzleData = snapshot.puzzleData;
    if (!puzzleData || isHydratingRef.current) return;
    persistSession(
      puzzleData.problemid,
      snapshot,
      timer.elapsedMs,
      timer.isRunning,
      hintStep,
      hintMove,
    );
  }, [
    hintMove,
    hintStep,
    persistSession,
    snapshot,
    timer.elapsedMs,
    timer.isRunning,
  ]);

  useEffect(() => {
    if (!isHydratingRef.current || !snapshot.puzzleData) return;

    const loadContext = pendingLoadContextRef.current;
    pendingLoadContextRef.current = null;
    isHydratingRef.current = false;

    if (loadContext) {
      const shouldRunTimer =
        snapshot.phase !== "complete" && loadContext.isTimerRunning;
      timerRef.current.hydrate(loadContext.timerMs, shouldRunTimer);
      setHintMove(loadContext.hintMove);
      setHintStep(loadContext.hintStep);
      setIsHintLoading(false);
    } else {
      timerRef.current.hydrate(0, snapshot.phase !== "complete");
      clearHintState();
    }

    prevPhaseRef.current = snapshot.phase;
    prevIsFailedRef.current = snapshot.isFailed;
  }, [clearHintState, snapshot.isFailed, snapshot.phase, snapshot.puzzleData]);

  useEffect(() => {
    const justFailed = snapshot.isFailed && !prevIsFailedRef.current;
    prevIsFailedRef.current = snapshot.isFailed;
    if (!justFailed || !snapshot.puzzleData) return;

    const puzzleId = snapshot.puzzleData.problemid;
    updatePuzzleRef.current(
      puzzleId,
      buildFailureProgressUpdate(state.puzzles[puzzleId]),
    );
    onPuzzleFailedRef.current?.({
      puzzleId,
      timeMs: timerRef.current.elapsedMs,
    });
  }, [snapshot.isFailed, snapshot.puzzleData, state.puzzles]);

  useEffect(() => {
    const phase = snapshot.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase !== "complete" || prev === "complete") return;

    const finalMs = timerRef.current.stop();
    const puzzleData = snapshot.puzzleData;
    if (!puzzleData) return;
    const prevPuzzleState = state.puzzles[puzzleData.problemid];
    const wasSuccess = !snapshot.isFailed;
    updatePuzzleRef.current(
      puzzleData.problemid,
      buildCompletionProgressUpdate(prevPuzzleState, wasSuccess, finalMs),
    );
    onPuzzleCompleteRef.current?.({
      puzzleId: puzzleData.problemid,
      timeMs: finalMs,
      success: wasSuccess,
    });
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
    stockfish.status === "ready" ||
    stockfish.status === "error";

  useEffect(() => {
    if (!puzzles || !engineSettled) return;
    const puzzle = getPuzzleById(puzzles, state.currentPuzzleId);
    if (!puzzle) return;

    const restoredSession = sessionByPuzzleIdRef.current.get(puzzle.problemid);
    const restoredEngineState = restoredSession?.engineState;
    const initialSolutionIndex = restoredEngineState
      ? countPlies(restoredEngineState.moveHistory)
      : 0;

    const solution = parseMoves(puzzle.moves);
    const sf = stockfishRef.current;
    const useEngine = sf.status === "ready";

    const strategy: PuzzleStrategy = useEngine
      ? sf.createEngineStrategy(solution, {
          initialSolutionIndex,
        })
      : createSolutionStrategy(solution, {
          initialSolutionIndex,
        });

    isHydratingRef.current = true;
    pendingLoadContextRef.current = restoredSession
      ? {
          timerMs: restoredSession.timerMs,
          isTimerRunning: restoredSession.isTimerRunning,
          hintStep: restoredSession.hintStep,
          hintMove: restoredSession.hintMove,
        }
      : {
          timerMs: 0,
          isTimerRunning: true,
          hintStep: 0,
          hintMove: null,
        };

    console.log(`[usePuzzle] Loading puzzle #${puzzle.problemid} (${puzzle.type}), strategy=${useEngine ? "engine" : "solution"}`);
    engineRef.current?.loadPuzzle(puzzle, strategy, restoredEngineState);
  }, [puzzles, state.currentPuzzleId, engineSettled]);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    clearHintState();
    engineRef.current?.makeMove(from, to, promotion).catch((err: unknown) => {
      console.error("Move processing failed:", err);
    });
  }, [clearHintState]);

  const getPromotionOptions = useCallback((from: string, to: string): PromotionPiece[] => {
    return engineRef.current?.getPromotionOptions(from, to) ?? [];
  }, []);

  const requestHint = useCallback(async () => {
    const puzzleData = snapshot.puzzleData;
    if (!puzzleData || snapshot.phase === "complete" || isHintLoading) return;

    if (hintStep === 2 && hintMove) {
      clearHintState();
      makeMove(hintMove.from, hintMove.to, hintMove.promotion);
      return;
    }

    if (hintStep === 1 && hintMove) {
      setHintStep(2);
      return;
    }

    const requestId = hintRequestIdRef.current + 1;
    hintRequestIdRef.current = requestId;
    setIsHintLoading(true);

    let suggestedMove: ParsedMove | null = null;
    try {
      suggestedMove = (await engineRef.current?.suggestMove()) ?? null;
    } catch (error) {
      console.error("Hint request failed:", error);
    }

    if (requestId !== hintRequestIdRef.current) return;
    setIsHintLoading(false);
    if (!suggestedMove) return;

    setHintMove(suggestedMove);
    setHintStep(1);

    updatePuzzleRef.current(
      puzzleData.problemid,
      buildHintProgressUpdate(state.puzzles[puzzleData.problemid]),
    );
  }, [
    clearHintState,
    hintMove,
    hintStep,
    isHintLoading,
    makeMove,
    snapshot.phase,
    snapshot.puzzleData,
    state.puzzles,
  ]);

  const isAtInitialState = snapshot.puzzleData
    ? snapshot.fen === snapshot.puzzleData.fen &&
      snapshot.moveHistory.length === 0 &&
      !snapshot.isFailed
    : true;

  const resetCurrentPuzzle = useCallback(() => {
    const puzzleData = snapshot.puzzleData;
    if (!puzzleData || isAtInitialState) return;

    const solution = parseMoves(puzzleData.moves);
    const sf = stockfishRef.current;
    const useEngine = sf.status === "ready";
    const strategy: PuzzleStrategy = useEngine
      ? sf.createEngineStrategy(solution, { initialSolutionIndex: 0 })
      : createSolutionStrategy(solution, { initialSolutionIndex: 0 });

    hintRequestIdRef.current += 1;
    isHydratingRef.current = true;
    pendingLoadContextRef.current = {
      timerMs: timerRef.current.elapsedMs,
      isTimerRunning: timerRef.current.isRunning,
      hintStep: 0,
      hintMove: null,
    };

    engineRef.current?.loadPuzzle(puzzleData, strategy);
  }, [isAtInitialState, snapshot.puzzleData]);

  const isLastPuzzle = state.currentPuzzleId >= TOTAL_PUZZLES;

  const nextPuzzle = useCallback(() => {
    if (state.currentPuzzleId >= TOTAL_PUZZLES) return;
    persistCurrentSession();
    clearHintState();
    setCurrentPuzzleId(state.currentPuzzleId + 1);
  }, [
    clearHintState,
    persistCurrentSession,
    state.currentPuzzleId,
    setCurrentPuzzleId,
  ]);

  const previousPuzzle = useCallback(() => {
    if (state.currentPuzzleId <= 1) return;
    persistCurrentSession();
    clearHintState();
    setCurrentPuzzleId(state.currentPuzzleId - 1);
  }, [
    clearHintState,
    persistCurrentSession,
    state.currentPuzzleId,
    setCurrentPuzzleId,
  ]);

  const goToPuzzle = useCallback(
    (puzzleId: number) => {
      const clampedId = Math.max(1, Math.min(TOTAL_PUZZLES, puzzleId));
      if (clampedId === state.currentPuzzleId) return;
      persistCurrentSession();
      clearHintState();
      setCurrentPuzzleId(clampedId);
    },
    [clearHintState, persistCurrentSession, state.currentPuzzleId, setCurrentPuzzleId],
  );

  return {
    ...snapshot,
    currentPuzzleId: state.currentPuzzleId,
    settings: state.settings,
    elapsedMs: timer.elapsedMs,
    formattedTime: timer.formatted,
    makeMove,
    getPromotionOptions,
    nextPuzzle,
    previousPuzzle,
    goToPuzzle,
    hintStep,
    hintMove,
    isHintLoading,
    requestHint,
    resetCurrentPuzzle,
    isAtInitialState,
    isLastPuzzle,
    loadError,
    isLoading: (puzzles === null && loadError === null) || !engineSettled,
    engineStatus: stockfish.status,
    engineError: stockfish.error,
  };
}
