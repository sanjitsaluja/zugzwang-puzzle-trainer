import type { GamePhase } from "@/types";

interface TimerProps {
  formatted: string;
  phase: GamePhase;
  isFailed: boolean;
}

export function Timer({ formatted, phase, isFailed }: TimerProps) {
  const isComplete = phase === "complete";
  const timerClass = isComplete ? (isFailed ? "failed" : "success") : "";
  const label = isComplete ? (isFailed ? "Time" : "Solve Time") : "Elapsed";

  return (
    <div className="timer-section">
      <div className={`timer-display ${timerClass}`}>{formatted}</div>
      <div className="timer-label">{label}</div>
    </div>
  );
}
