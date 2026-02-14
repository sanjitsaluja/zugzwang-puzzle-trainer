import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SettingsContent } from "@/components/SettingsContent";
import type { StatsContentProps } from "@/components/Stats";
import { StatsContent } from "@/components/Stats";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Panel } from "@/components/ui/Panel";

const CLOSE_ANIMATION_MS = 150;
const MENU_SEGMENTS = [
  { value: "stats", label: "Stats" },
  { value: "settings", label: "Settings" },
] as const;

type MenuTab = "stats" | "settings";

const DEFAULT_SCROLL_POSITIONS: Record<MenuTab, number> = {
  stats: 0,
  settings: 0,
};

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
  const [activeTab, setActiveTab] = useState<MenuTab>("stats");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const statsBodyRef = useRef<HTMLElement | null>(null);
  const settingsBodyRef = useRef<HTMLDivElement | null>(null);
  const scrollByTabRef = useRef<Record<MenuTab, number>>({ ...DEFAULT_SCROLL_POSITIONS });

  const getScrollElement = useCallback((tab: MenuTab) => {
    return tab === "stats" ? statsBodyRef.current : settingsBodyRef.current;
  }, []);

  const setTab = useCallback(
    (nextTab: MenuTab) => {
      if (nextTab === activeTab) return;
      const activeScrollNode = getScrollElement(activeTab);
      if (activeScrollNode) {
        scrollByTabRef.current[activeTab] = activeScrollNode.scrollTop;
      }
      setActiveTab(nextTab);
    },
    [activeTab, getScrollElement],
  );

  useLayoutEffect(() => {
    const activeScrollNode = getScrollElement(activeTab);
    if (!activeScrollNode) return;
    activeScrollNode.scrollTop = scrollByTabRef.current[activeTab];
  }, [activeTab, getScrollElement]);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setIsClosing(false);
      setActiveTab("stats");
      scrollByTabRef.current = { ...DEFAULT_SCROLL_POSITIONS };
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
        aria-label="Menu"
        data-state={isClosing ? "closing" : "open"}
      >
        <div className="ui-menu-root">
          <header className="ui-menu-head">
            <button
              type="button"
              className="ui-menu-close-button"
              aria-label="Close menu"
              onClick={onClose}
              data-close-focus
            >
              ×
            </button>

            <h1 className="ui-menu-title">{activeTab === "stats" ? "Stats" : "Settings"}</h1>
            <span className="ui-menu-head-spacer" aria-hidden="true" />
          </header>

          <div className="ui-menu-segments">
            <SegmentedControl
              ariaLabel="Menu sections"
              segments={MENU_SEGMENTS.map(({ value, label }) => ({ value, label }))}
              value={activeTab}
              onChange={(tab) => setTab(tab === "settings" ? "settings" : "stats")}
            />
          </div>

          <div className="ui-menu-panel">
            {activeTab === "stats" ? (
              <StatsContent bodyRef={statsBodyRef} {...statsProps} />
            ) : (
              <SettingsContent bodyRef={settingsBodyRef} />
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
