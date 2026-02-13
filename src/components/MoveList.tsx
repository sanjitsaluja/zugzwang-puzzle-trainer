import type { MoveRecord } from "@/hooks/usePuzzle";

interface MoveListProps {
  moves: MoveRecord[];
  showPlaceholder: boolean;
}

export function MoveList({ moves, showPlaceholder }: MoveListProps) {
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
