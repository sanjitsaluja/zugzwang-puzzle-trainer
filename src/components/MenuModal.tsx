import { useEffect, useRef, useState } from "react";
import type { StatsContentProps } from "@/components/Stats";
import { StatsContent } from "@/components/Stats";
import { Panel } from "@/components/ui/Panel";

const CLOSE_ANIMATION_MS = 150;

interface MenuModalProps extends StatsContentProps {
  open: boolean;
  onClose: () => void;
}

export function MenuModal({
  open,
  onClose,
  ...statsProps
}: MenuModalProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setIsClosing(false);
      return;
    }
    if (!isMounted) return;

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isMounted, open]);

  useEffect(() => {
    if (!open) return;
    const activeElement = document.activeElement;
    restoreFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;

    const frameId = window.requestAnimationFrame(() => {
      overlayRef.current
        ?.querySelector<HTMLButtonElement>("[data-close-focus]")
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  useEffect(() => {
    if (open || isMounted) return;
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, [isMounted, open]);

  if (!isMounted) return null;

  return (
    <div
      ref={overlayRef}
      className="ui-stats-overlay"
      data-state={isClosing ? "closing" : "open"}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <Panel
        className="ui-stats-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Stats"
        data-state={isClosing ? "closing" : "open"}
      >
        <StatsContent onClose={onClose} {...statsProps} />
      </Panel>
    </div>
  );
}

