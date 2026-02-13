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
      <div>
        <div className="ui-puzzle-number">
          {puzzleId}{" "}
          <span className="ui-puzzle-total">
            / {TOTAL_PUZZLES}
          </span>
        </div>
        <div className="ui-puzzle-meta">
          <span className="ui-puzzle-type">{puzzleType}</span>
          {!isComplete && (
            <span className="ui-puzzle-side">
              {" "}
              &middot; {sideToMove.replace(" to Move", " to move")}
            </span>
          )}
          {statusState && (
            <span className="ui-puzzle-status" data-state={statusState}>
              {" "}
              &middot; {statusLabel}
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}
