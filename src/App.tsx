import { Board } from "@/components/Board";
import { usePuzzle } from "@/hooks/usePuzzle";
import type { MoveRecord } from "@/hooks/usePuzzle";
import type { BoardColor, GamePhase } from "@/types";
import { TOTAL_PUZZLES } from "@/types";
import "@/styles/app.css";

function MoveList({ moves, showPlaceholder }: { moves: MoveRecord[]; showPlaceholder: boolean }) {
  return (
    <div className="moves-section">
      <div className="moves-header">Moves</div>
      <ol className="move-list">
        {moves.map((record) => (
          <li key={record.moveNumber} className="move-row">
            <span className="move-number">{record.moveNumber}.</span>
            <span className={`move-san ${record.userMove.correct ? "correct" : "incorrect"}`}>
              {record.userMove.san}
              {!record.userMove.correct ? "?" : ""}
            </span>
            {record.opponentMove && (
              <span className="move-opponent">{record.opponentMove.san}</span>
            )}
          </li>
        ))}
        {showPlaceholder && (
          <li className="move-row">
            <span className="move-number">{moves.length + 1}.</span>
            <span className="move-placeholder">Your move...</span>
          </li>
        )}
      </ol>
    </div>
  );
}

function TimerDisplay({
  formatted,
  phase,
  isFailed,
}: {
  formatted: string;
  phase: GamePhase;
  isFailed: boolean;
}) {
  const isComplete = phase === "complete";
  const timerClass = isComplete
    ? isFailed
      ? "failed"
      : "success"
    : "";
  const label = isComplete
    ? isFailed
      ? "Time"
      : "Solve Time"
    : "Elapsed";

  return (
    <div className="timer-section">
      <div className={`timer-display ${timerClass}`}>{formatted}</div>
      <div className="timer-label">{label}</div>
    </div>
  );
}

function PuzzleStatus({ phase, isFailed }: { phase: GamePhase; isFailed: boolean }) {
  if (phase === "complete" && !isFailed) {
    return <span className="puzzle-status solved"> &middot; Solved &#10003;</span>;
  }
  if (phase === "complete" && isFailed) {
    return <span className="puzzle-status failed"> &middot; Failed</span>;
  }
  return null;
}

function deriveCheckColor(isCheck: boolean, turnColor: BoardColor): BoardColor | false {
  return isCheck ? turnColor : false;
}

export function App() {
  const puzzle = usePuzzle();

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

  const boardStateClass = [
    "board-wrapper",
    isComplete ? "state-complete" : "",
    isComplete && !puzzle.isFailed ? "state-success" : "",
    isComplete && puzzle.isFailed ? "state-failed" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
            lastMove={puzzle.lastMove}
            check={deriveCheckColor(puzzle.isCheck, puzzle.turnColor)}
            onMove={puzzle.makeMove}
          />
        </div>

        <div className="info-panel">
          <div className="puzzle-info">
            <div>
              <div className="puzzle-number">
                {puzzleId} <span className="total">/ {TOTAL_PUZZLES}</span>
              </div>
              <div className="puzzle-meta">
                <span className="puzzle-type">{puzzleType}</span>
                {!isComplete && (
                  <span className="puzzle-status"> &middot; {sideToMove.replace(" to Move", " to move")}</span>
                )}
                <PuzzleStatus phase={puzzle.phase} isFailed={puzzle.isFailed} />
              </div>
            </div>
          </div>

          <TimerDisplay
            formatted={puzzle.formattedTime}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          <MoveList
            moves={puzzle.moveHistory}
            showPlaceholder={puzzle.phase === "playing" && !puzzle.isFailed}
          />

          <div className="action-bar">
            <button
              className={`btn btn-next ${isComplete && !puzzle.isLastPuzzle ? "active" : ""}`}
              disabled={!isComplete || puzzle.isLastPuzzle}
              onClick={puzzle.nextPuzzle}
            >
              {puzzle.isLastPuzzle && isComplete ? "All puzzles complete!" : "Next \u2192"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
