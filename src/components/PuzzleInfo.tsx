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

function normalizeSideLabel(sideToMove: string): string {
  return sideToMove.replace(" to Move", " to move");
}

function resolveSideColor(sideToMove: string): "white" | "black" | null {
  const normalized = sideToMove.toLowerCase();
  if (normalized.includes("white")) return "white";
  if (normalized.includes("black")) return "black";
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
  const statusState = isComplete ? (isFailed ? "danger" : "success") : null;
  const statusLabel = isFailed ? "Failed" : "Solved";
  const sideLabel = normalizeSideLabel(sideToMove);
  const sideColor = resolveSideColor(sideToMove);

  return (
    <Panel className="ui-puzzle-info-panel" aria-label="Puzzle details">
      <h2 className="ui-puzzle-id-group" aria-label={`Puzzle ${puzzleId} of ${TOTAL_PUZZLES}`}>
        <span className="ui-puzzle-hash">#</span>
        <span className="ui-puzzle-number">{puzzleId}</span>
        <span className="ui-puzzle-total">/ {TOTAL_PUZZLES.toLocaleString()}</span>
        <span className="ui-puzzle-source">Susan Polgar</span>
      </h2>
      <div className="ui-puzzle-objective-group">
        <h3 className="ui-puzzle-type">{formatPuzzleTypeLabel(puzzleType)}</h3>
        {!isComplete && (
          <p className="ui-puzzle-side" data-color={sideColor ?? undefined} aria-label={sideLabel}>
            {sideColor && <span className="ui-puzzle-side-indicator" aria-hidden="true" />}
            <span className="ui-puzzle-side-text">{sideLabel}</span>
          </p>
        )}
        {statusState && (
          <p className="ui-puzzle-status" data-state={statusState}>
            {statusLabel}
          </p>
        )}
      </div>
    </Panel>
  );
}
