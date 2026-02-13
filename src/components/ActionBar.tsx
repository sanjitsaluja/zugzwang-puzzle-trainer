import { Button } from "@/components/ui/Button";

interface ActionBarProps {
  isBackDisabled: boolean;
  isNextDisabled: boolean;
  isNextActive: boolean;
  isComplete: boolean;
  isLastPuzzle: boolean;
  settingsLabel: string;
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
  settingsLabel,
  onBack,
  onOpenSettings,
  onOpenStats,
  onNext,
}: ActionBarProps) {
  return (
    <div className="ui-action-bar">
      <Button className="ui-action-bar-button ui-action-bar-button-compact" disabled={isBackDisabled} onClick={onBack}>
        Back
      </Button>
      <Button className="ui-action-bar-button ui-action-bar-button-compact" onClick={onOpenSettings}>
        {settingsLabel}
      </Button>
      <Button className="ui-action-bar-button ui-action-bar-button-compact" onClick={onOpenStats}>
        Stats
      </Button>
      <Button
        className="ui-action-bar-button ui-action-bar-button-next"
        variant={isNextActive ? "primary" : "default"}
        disabled={isNextDisabled}
        onClick={onNext}
      >
        {isLastPuzzle && isComplete ? "All puzzles complete!" : "Next →"}
      </Button>
    </div>
  );
}
