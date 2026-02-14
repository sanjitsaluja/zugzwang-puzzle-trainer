import { useState } from "react";
import type { ThemePreference, ResolvedTheme } from "@/lib/theme";
import type { StatsContentProps } from "@/components/Stats";
import { StatsContent } from "@/components/Stats";
import { SettingsContent } from "@/components/SettingsContent";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

type MenuTab = "stats" | "settings";

const TAB_SEGMENTS = [
  { value: "stats", label: "Stats" },
  { value: "settings", label: "Settings" },
];

interface MenuModalProps extends StatsContentProps {
  open: boolean;
  onClose: () => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onSetThemePreference: (pref: ThemePreference) => void;
}

export function MenuModal({
  open,
  onClose,
  themePreference,
  resolvedTheme,
  onSetThemePreference,
  ...statsProps
}: MenuModalProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("stats");

  if (!open) return null;

  return (
    <div
      className="ui-stats-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <Panel className="ui-stats-modal" role="dialog" aria-modal="true" aria-label="Menu">
        <header className="ui-menu-header">
          <SegmentedControl
            segments={TAB_SEGMENTS}
            value={activeTab}
            onChange={(val) => setActiveTab(val as MenuTab)}
          />
          <Button className="ui-stats-close-button" onClick={onClose}>
            Close
          </Button>
        </header>

        {activeTab === "stats" ? (
          <StatsContent {...statsProps} />
        ) : (
          <SettingsContent
            preference={themePreference}
            resolvedTheme={resolvedTheme}
            onSetPreference={onSetThemePreference}
          />
        )}
      </Panel>
    </div>
  );
}
