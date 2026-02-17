import { useEffect } from "react";

interface UseDesktopShortcutsOptions {
  isMenuOpen: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  isHintDisabled: boolean;
  isResetDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHint: () => void;
  onReset: () => void;
}

const DESKTOP_SHORTCUTS_MEDIA_QUERY = "(min-width: 64.0625rem)";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true']")) return true;
  return (
    target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT"
  );
}

function isDesktopViewport(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia(DESKTOP_SHORTCUTS_MEDIA_QUERY).matches;
}

export function useDesktopShortcuts({
  isMenuOpen,
  isPrevDisabled,
  isNextDisabled,
  isHintDisabled,
  isResetDisabled,
  onPrev,
  onNext,
  onHint,
  onReset,
}: UseDesktopShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!isDesktopViewport()) return;
      if (isMenuOpen) return;
      if (event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isEditableTarget(event.target)) return;

      switch (event.key.toLowerCase()) {
        case "a": {
          if (isPrevDisabled) return;
          event.preventDefault();
          onPrev();
          return;
        }
        case "d": {
          if (isNextDisabled) return;
          event.preventDefault();
          onNext();
          return;
        }
        case "h": {
          if (isHintDisabled) return;
          event.preventDefault();
          onHint();
          return;
        }
        case "r": {
          if (isResetDisabled) return;
          event.preventDefault();
          onReset();
          return;
        }
        default:
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isHintDisabled,
    isMenuOpen,
    isNextDisabled,
    isPrevDisabled,
    isResetDisabled,
    onHint,
    onNext,
    onPrev,
    onReset,
  ]);
}
