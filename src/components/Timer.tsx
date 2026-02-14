import type { GamePhase } from "@/types";
import { Panel } from "@/components/ui/Panel";

interface TimerProps {
  formatted: string;
  phase: GamePhase;
  isFailed: boolean;
}

function StopwatchIcon() {
  return (
    <svg
      className="ui-timer-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="9.5" r="5" />
      <path d="M8 7.5v2l1.5 1.5" />
      <path d="M6.5 2h3M8 2v2.5" />
    </svg>
  );
}

export function Timer({ formatted, phase, isFailed }: TimerProps) {
  const isComplete = phase === "complete";
  const timerTone = isComplete
    ? isFailed
      ? "danger"
      : "success"
    : "default";
  const label = isComplete ? (isFailed ? "Time" : "Solve Time") : "time";

  return (
    <Panel className="ui-panel-timer">
      <div className="ui-timer-display" data-tone={timerTone}>
        <StopwatchIcon />
        {formatted}
      </div>
      <div className="ui-timer-label">{label}</div>
    </Panel>
  );
}
