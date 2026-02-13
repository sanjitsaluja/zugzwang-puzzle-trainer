import type { GamePhase } from "@/types";
import { TOTAL_PUZZLES } from "@/types";

interface PuzzleInfoProps {
  puzzleId: number;
  puzzleType: string;
  sideToMove: string;
  phase: GamePhase;
  isFailed: boolean;
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

export function PuzzleInfo({
  puzzleId,
  puzzleType,
  sideToMove,
  phase,
  isFailed,
}: PuzzleInfoProps) {
  const isComplete = phase === "complete";

  return (
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
          <PuzzleStatus phase={phase} isFailed={isFailed} />
        </div>
      </div>
    </div>
  );
}
