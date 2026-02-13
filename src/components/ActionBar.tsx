interface ActionBarProps {
  isBackDisabled: boolean;
  isNextDisabled: boolean;
  isNextActive: boolean;
  isComplete: boolean;
  isLastPuzzle: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onNext: () => void;
}

export function ActionBar({
  isBackDisabled,
  isNextDisabled,
  isNextActive,
  isComplete,
  isLastPuzzle,
  onBack,
  onOpenSettings,
  onOpenStats,
  onNext,
}: ActionBarProps) {
  return (
    <div className="action-bar">
      <button className="btn btn-back" disabled={isBackDisabled} onClick={onBack}>
        Back
      </button>
      <button className="btn btn-icon" onClick={onOpenSettings}>
        Settings
      </button>
      <button className="btn btn-stats" onClick={onOpenStats}>
        Stats
      </button>
      <button
        className={`btn btn-next ${isNextActive ? "active" : ""}`}
        disabled={isNextDisabled}
        onClick={onNext}
      >
        {isLastPuzzle && isComplete ? "All puzzles complete!" : "Next →"}
      </button>
    </div>
  );
}
