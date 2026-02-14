import type { ThemePreference, ResolvedTheme } from "@/lib/theme";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

const THEME_SEGMENTS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

interface SettingsContentProps {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onSetPreference: (pref: ThemePreference) => void;
}

export function SettingsContent({
  preference,
  resolvedTheme,
  onSetPreference,
}: SettingsContentProps) {
  return (
    <Panel className="ui-stats-section">
      <Label className="ui-stats-section-title">Appearance</Label>
      <div className="ui-settings-theme-row">
        <SegmentedControl
          segments={THEME_SEGMENTS}
          value={preference}
          onChange={(val) => onSetPreference(val as ThemePreference)}
        />
        {preference === "system" && (
          <span className="ui-settings-theme-hint">
            Using {resolvedTheme} mode
          </span>
        )}
      </div>
    </Panel>
  );
}
