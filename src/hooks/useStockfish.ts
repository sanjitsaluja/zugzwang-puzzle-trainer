import { useEffect, useRef, useState } from "react";
import { StockfishEngine, uciToParsedMove } from "@/lib/stockfish";
import type { AnalysisResult } from "@/lib/stockfish";
import type {
  GetOpponentMoveFn,
  ParsedMove,
  PuzzleStrategy,
  ValidateMoveFn,
} from "@/types";

type EngineStatus = "loading" | "ready" | "error";

interface UseStockfishReturn {
  status: EngineStatus;
  error: string | null;
  createEngineStrategy: (solution: ParsedMove[]) => PuzzleStrategy;
}

function isCorrectMove(result: AnalysisResult, remainingMateDepth: number): boolean {
  if (!result.score || result.score.type !== "mate") return false;
  // After user's move, it's opponent's turn. A negative mate score means
  // the side to move (opponent) gets mated — good for us.
  return result.score.value < 0 && Math.abs(result.score.value) <= remainingMateDepth;
}

export function useStockfish(): UseStockfishReturn {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [status, setStatus] = useState<EngineStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;

    engine
      .init()
      .then(() => {
        if (!engine.isDisposed) {
          console.log("[useStockfish] Engine ready");
          setStatus("ready");
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load engine";
        console.error("[useStockfish] Engine failed:", message);
        setError(message);
        setStatus("error");
      });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const createEngineStrategy = (solution: ParsedMove[]): PuzzleStrategy => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady) {
      throw new Error("Engine not ready");
    }

    let solutionIndex = 0;

    const validateMove: ValidateMoveFn = async (_fen, userMove, remainingMateDepth) => {
      solutionIndex++;

      console.log(`[engineStrategy] validateMove: fen=${_fen.slice(0, 40)}... remaining=${remainingMateDepth}`);
      const result = await engine.analyze(_fen);
      const correct = isCorrectMove(result, remainingMateDepth);
      const opponentMove = result.bestMove ? uciToParsedMove(result.bestMove) : null;

      console.log(`[engineStrategy] isCorrect=${correct} opponentMove=${opponentMove ? `${opponentMove.from}${opponentMove.to}` : "null"} score=${JSON.stringify(result.score)}`);

      if (!correct) {
        return { isCorrect: false, opponentMove };
      }

      if (opponentMove) solutionIndex++;

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

  return { status, error, createEngineStrategy };
}
