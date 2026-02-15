import { useEffect, useRef, useState } from "react";
import { StockfishEngine, uciToParsedMove } from "@/lib/stockfish";
import type { AnalysisResult } from "@/lib/stockfish";
import type {
  GetOpponentMoveFn,
  ParsedMove,
  PuzzleStrategy,
  ValidateMoveFn,
} from "@/types";

type EngineStatus = "idle" | "loading" | "ready" | "error";

interface UseStockfishReturn {
  status: EngineStatus;
  error: string | null;
  start: () => Promise<void>;
  waitUntilReady: () => Promise<boolean>;
  createEngineStrategy: (
    solution: ParsedMove[],
    options?: {
      initialSolutionIndex?: number;
      onSolutionIndexChange?: (index: number) => void;
    },
  ) => PuzzleStrategy;
}

function isCorrectMove(result: AnalysisResult, remainingMateDepth: number): boolean {
  if (!result.score || result.score.type !== "mate") return false;
  // After user's move, it's opponent's turn. A negative mate score means
  // the side to move (opponent) gets mated — good for us.
  return result.score.value < 0 && Math.abs(result.score.value) <= remainingMateDepth;
}

export function useStockfish(): UseStockfishReturn {
  const engineRef = useRef<StockfishEngine | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const isUnmountedRef = useRef(false);
  const statusRef = useRef<EngineStatus>("idle");
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    const currentStatus = statusRef.current;
    if (currentStatus === "ready" || currentStatus === "error") return;
    const existingPromise = initPromiseRef.current;
    if (existingPromise) {
      await existingPromise;
      return;
    }

    const engine = engineRef.current ?? new StockfishEngine();
    engineRef.current = engine;
    statusRef.current = "loading";
    if (!isUnmountedRef.current) {
      setStatus("loading");
      setError(null);
    }

    const initPromise = engine
      .init()
      .then(() => {
        if (!engine.isDisposed && !isUnmountedRef.current) {
          statusRef.current = "ready";
          console.log("[useStockfish] Engine ready");
          setStatus("ready");
        }
      })
      .catch((err: unknown) => {
        statusRef.current = "error";
        const message = err instanceof Error ? err.message : "Failed to load engine";
        if (!isUnmountedRef.current) {
          console.error("[useStockfish] Engine failed:", message);
          setError(message);
          setStatus("error");
        }
      })
      .finally(() => {
        initPromiseRef.current = null;
      });

    initPromiseRef.current = initPromise;
    await initPromise;
  };

  const waitUntilReady = async (): Promise<boolean> => {
    await start();
    return statusRef.current === "ready";
  };

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      engineRef.current?.dispose();
      engineRef.current = null;
      initPromiseRef.current = null;
    };
  }, []);

  const createEngineStrategy = (
    solution: ParsedMove[],
    options?: {
      initialSolutionIndex?: number;
      onSolutionIndexChange?: (index: number) => void;
    },
  ): PuzzleStrategy => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady) {
      throw new Error("Engine not ready");
    }

    let solutionIndex = options?.initialSolutionIndex ?? 0;
    const setSolutionIndex = (next: number) => {
      solutionIndex = next;
      options?.onSolutionIndexChange?.(next);
    };

    const validateMove: ValidateMoveFn = async (_fen, userMove, remainingMateDepth) => {
      setSolutionIndex(solutionIndex + 1);

      console.log(`[engineStrategy] validateMove: fen=${_fen.slice(0, 40)}... remaining=${remainingMateDepth}`);
      const result = await engine.analyze(_fen);
      const correct = isCorrectMove(result, remainingMateDepth);
      const opponentMove = result.bestMove ? uciToParsedMove(result.bestMove) : null;

      console.log(`[engineStrategy] isCorrect=${correct} opponentMove=${opponentMove ? `${opponentMove.from}${opponentMove.to}` : "null"} score=${JSON.stringify(result.score)}`);

      if (!correct) {
        return { isCorrect: false, opponentMove };
      }

      if (opponentMove) setSolutionIndex(solutionIndex + 1);

      return { isCorrect: true, opponentMove };
    };

    const getOpponentMove: GetOpponentMoveFn = async (fen) => {
      console.log(`[engineStrategy] getOpponentMove: fen=${fen.slice(0, 40)}...`);
      const result = await engine.analyze(fen);
      console.log(`[engineStrategy] getOpponentMove result: bestMove=${result.bestMove}`);
      return result.bestMove ? uciToParsedMove(result.bestMove) : null;
    };

    return {
      validateMove,
      getOpponentMove,
      freePlayBothSides: false,
    };
  };

  return { status, error, start, waitUntilReady, createEngineStrategy };
}
