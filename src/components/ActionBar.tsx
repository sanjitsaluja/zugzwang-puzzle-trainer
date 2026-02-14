import { Button } from "@/components/ui/Button";

interface ActionBarProps {
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  isHintDisabled: boolean;
  isResetDisabled: boolean;
  isHintBusy: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHint: () => void;
  onReset: () => void;
}

export function ActionBar({
  isPrevDisabled,
  isNextDisabled,
  isHintDisabled,
  isResetDisabled,
  isHintBusy,
  onPrev,
  onNext,
  onHint,
  onReset,
}: ActionBarProps) {
  return (
    <div className="ui-action-bar" role="toolbar" aria-label="Puzzle controls">
      <div className="ui-action-bar-nav-group" role="group" aria-label="Puzzle navigation">
        <Button
          className="ui-action-bar-nav-arrow ui-action-bar-prev"
          aria-label="Previous puzzle"
          disabled={isPrevDisabled}
          onClick={onPrev}
        >
          ← <kbd>A</kbd>
        </Button>
        <Button
          className="ui-action-bar-nav-arrow ui-action-bar-next"
          aria-label="Next puzzle"
          disabled={isNextDisabled}
          onClick={onNext}
        >
          → <kbd>D</kbd>
        </Button>
      </div>

      <div className="ui-action-bar-divider" aria-hidden="true" />

      <div className="ui-action-bar-center" role="group" aria-label="Hint and reset actions">
        <Button
          className="ui-action-bar-center-btn ui-action-bar-hint"
          disabled={isHintDisabled}
          onClick={onHint}
        >
          💡 {isHintBusy ? "Thinking..." : "Hint"} <kbd>H</kbd>
        </Button>
        <Button
          className="ui-action-bar-center-btn ui-action-bar-reset"
          disabled={isResetDisabled}
          onClick={onReset}
        >
          ↺ Reset <kbd>R</kbd>
        </Button>
      </div>
    </div>
  );
}
