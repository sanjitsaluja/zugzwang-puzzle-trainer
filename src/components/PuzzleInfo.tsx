import type { GamePhase } from "@/types";
import { TOTAL_PUZZLES } from "@/types";
import { Panel } from "@/components/ui/Panel";

interface PuzzleInfoProps {
  puzzleId: number;
  puzzleType: string;
  sideToMove: string;
  phase: GamePhase;
  isFailed: boolean;
}

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  "Mate in One": "Mate in 1",
  "Mate in Two": "Mate in 2",
  "Mate in Three": "Mate in 3",
};

function formatPuzzleTypeLabel(type: string): string {
  return PUZZLE_TYPE_LABELS[type] ?? type;
}

export function PuzzleInfo({
  puzzleId,
  puzzleType,
  sideToMove,
  phase,
  isFailed,
}: PuzzleInfoProps) {
  const isComplete = phase === "complete";
  const statusState = isComplete ? (isFailed ? "danger" : "success") : null;
  const statusLabel = isFailed ? "Failed" : "Solved";

  return (
    <Panel className="ui-puzzle-info-panel">
      <div className="ui-puzzle-id-group" aria-label={`Puzzle ${puzzleId} of ${TOTAL_PUZZLES}`}>
        <span className="ui-puzzle-hash">#</span>
        <span className="ui-puzzle-number">{puzzleId}</span>
        <span className="ui-puzzle-total">/ {TOTAL_PUZZLES.toLocaleString()}</span>
        <div className="ui-puzzle-source">Susan Polgar</div>
      </div>
      <div className="ui-puzzle-objective-group">
        <div className="ui-puzzle-type">{formatPuzzleTypeLabel(puzzleType)}</div>
        {!isComplete && (
          <div className="ui-puzzle-side">
            {sideToMove.replace(" to Move", " to move")}
          </div>
        )}
        {statusState && (
          <div className="ui-puzzle-status" data-state={statusState}>
            {statusLabel}
          </div>
        )}
      </div>
    </Panel>
  );
}
