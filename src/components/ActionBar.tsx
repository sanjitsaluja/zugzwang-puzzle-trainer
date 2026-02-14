import { Button } from "@/components/ui/Button";

interface ActionBarProps {
  isBackDisabled: boolean;
  isNextDisabled: boolean;
  isNextActive: boolean;
  isComplete: boolean;
  isLastPuzzle: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function ActionBar({
  isBackDisabled,
  isNextDisabled,
  isNextActive,
  isComplete,
  isLastPuzzle,
  onBack,
  onNext,
}: ActionBarProps) {
  return (
    <div className="ui-action-bar">
      <div className="ui-action-bar-nav" role="group" aria-label="Puzzle navigation">
        <Button className="ui-action-bar-button ui-action-bar-back" disabled={isBackDisabled} onClick={onBack}>
          ← Back
        </Button>
        <Button
          className="ui-action-bar-button ui-action-bar-next"
          variant={isNextActive ? "primary" : "default"}
          disabled={isNextDisabled}
          onClick={onNext}
        >
          {isLastPuzzle && isComplete ? "All puzzles complete!" : "Next →"}
        </Button>
      </div>
    </div>
  );
}
