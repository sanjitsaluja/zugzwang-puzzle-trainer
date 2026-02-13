import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionBar } from "@/components/ActionBar";
import { Board } from "@/components/Board";
import { MoveList } from "@/components/MoveList";
import { PuzzleInfo } from "@/components/PuzzleInfo";
import { Timer } from "@/components/Timer";
import { usePuzzle } from "@/hooks/usePuzzle";
import type { BoardColor } from "@/types";
import "@/styles/app.css";

function parseRoutePuzzleId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function deriveCheckColor(isCheck: boolean, turnColor: BoardColor): BoardColor | false {
  return isCheck ? turnColor : false;
}

export function App() {
  const { puzzleId: puzzleIdParam } = useParams<{ puzzleId: string }>();
  const navigate = useNavigate();
  const puzzle = usePuzzle();
  const routePuzzleId = parseRoutePuzzleId(puzzleIdParam);

  useEffect(() => {
    if (routePuzzleId === null) {
      navigate(`/puzzle/${puzzle.currentPuzzleId}`, { replace: true });
      return;
    }
    if (routePuzzleId !== puzzle.currentPuzzleId) {
      puzzle.goToPuzzle(routePuzzleId);
    }
  }, [navigate, puzzle.currentPuzzleId, puzzle.goToPuzzle, routePuzzleId]);

  if (puzzle.isLoading) {
    const message =
      puzzle.engineStatus === "loading" ? "Loading engine..." : "Loading puzzles...";
    return <div className="app-loading">{message}</div>;
  }

  if (puzzle.loadError) {
    return <div className="app-error">{puzzle.loadError}</div>;
  }

  const puzzleId = puzzle.puzzleData?.problemid ?? 1;
  const puzzleType = puzzle.puzzleData?.type ?? "";
  const sideToMove = puzzle.puzzleData?.first ?? "";
  const isComplete = puzzle.phase === "complete";
  const isFirstPuzzle = puzzle.currentPuzzleId <= 1;
  const canAdvance = isComplete && !puzzle.isLastPuzzle;

  const boardStateClass = [
    "board-wrapper",
    isComplete ? "state-complete" : "",
    isComplete && !puzzle.isFailed ? "state-success" : "",
    isComplete && puzzle.isFailed ? "state-failed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const boardLastMove = puzzle.lastMove;
  const handleBack = () => {
    if (isFirstPuzzle) return;
    const targetPuzzleId = puzzle.currentPuzzleId - 1;
    puzzle.previousPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };
  const handleNext = () => {
    if (!canAdvance) return;
    const targetPuzzleId = puzzle.currentPuzzleId + 1;
    puzzle.nextPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };

  return (
    <div className="app">
      <div className="puzzle-layout">
        <div className={boardStateClass}>
          <Board
            fen={puzzle.fen}
            orientation={puzzle.orientation}
            turnColor={puzzle.turnColor}
            dests={puzzle.dests}
            interactive={puzzle.isInteractive}
            {...(boardLastMove ? { lastMove: boardLastMove } : {})}
            check={deriveCheckColor(puzzle.isCheck, puzzle.turnColor)}
            onMove={puzzle.makeMove}
          />
        </div>

        <div className="info-panel">
          <PuzzleInfo
            puzzleId={puzzleId}
            puzzleType={puzzleType}
            sideToMove={sideToMove}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          <Timer
            formatted={puzzle.formattedTime}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          <MoveList
            moves={puzzle.moveHistory}
            showPlaceholder={puzzle.phase === "playing" && !puzzle.isFailed}
          />

          <ActionBar
            isBackDisabled={isFirstPuzzle}
            isNextDisabled={!canAdvance}
            isNextActive={canAdvance}
            isComplete={isComplete}
            isLastPuzzle={puzzle.isLastPuzzle}
            onBack={handleBack}
            onOpenSettings={() => {}}
            onOpenStats={() => {}}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}
