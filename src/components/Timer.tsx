import type { GamePhase } from "@/types";
import { Panel } from "@/components/ui/Panel";

interface TimerProps {
  formatted: string;
  phase: GamePhase;
  isFailed: boolean;
}

export function Timer({ formatted, phase, isFailed }: TimerProps) {
  const isComplete = phase === "complete";
  const timerTone = isComplete
    ? isFailed
      ? "danger"
      : "success"
    : "default";
  const label = isComplete ? (isFailed ? "Time" : "Solve Time") : "Elapsed";

  return (
    <Panel className="ui-panel-timer">
      <div className="ui-timer-display" data-tone={timerTone}>{formatted}</div>
      <div className="ui-timer-label">{label}</div>
    </Panel>
  );
}
