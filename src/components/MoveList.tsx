import type { MoveRecord } from "@/hooks/usePuzzle";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

interface MoveListProps {
  moves: MoveRecord[];
  showPlaceholder: boolean;
}

export function MoveList({ moves, showPlaceholder }: MoveListProps) {
  return (
    <Panel className="ui-move-list-panel">
      <Label className="ui-move-list-title">Moves</Label>
      <ol className="ui-move-list">
        {moves.map((record) => (
          <li key={record.moveNumber} className="ui-move-row">
            <span className="ui-move-number">{record.moveNumber}.</span>
            <span
              className="ui-move-san"
              data-correct={record.userMove.correct ? "true" : "false"}
            >
              {record.userMove.san}
              {!record.userMove.correct ? "?" : ""}
            </span>
            {record.opponentMove && (
              <span className="ui-move-opponent">{record.opponentMove.san}</span>
            )}
          </li>
        ))}
        {showPlaceholder && (
          <li className="ui-move-row">
            <span className="ui-move-number">{moves.length + 1}.</span>
            <span className="ui-move-placeholder">
              Your move...
            </span>
          </li>
        )}
      </ol>
    </Panel>
  );
}
