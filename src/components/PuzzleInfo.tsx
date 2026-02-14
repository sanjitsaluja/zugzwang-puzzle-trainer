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
      <div className="ui-puzzle-id-group">
        <div
          className="ui-puzzle-number"
          aria-label={`Puzzle ${puzzleId} of ${TOTAL_PUZZLES}`}
        >
          <span className="ui-puzzle-hash">#</span>
          {puzzleId}
          <span className="ui-puzzle-total"> / {TOTAL_PUZZLES}</span>
        </div>
        <div className="ui-puzzle-source">Susan Polgar</div>
      </div>
      <div className="ui-puzzle-objective-group">
        <div className="ui-puzzle-type">{puzzleType}</div>
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
