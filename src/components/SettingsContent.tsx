import { useId, type RefObject } from "react";
import {
  ANIMATION_SPEED_MAX_MS,
  ANIMATION_SPEED_MIN_MS,
  ANIMATION_SPEED_STEP_MS,
  BOARD_THEMES,
  OVERALL_THEMES,
  PIECE_SETS,
  TOTAL_PUZZLES,
  type AppSettings,
  type BoardTheme,
  type OverallTheme,
  type PieceSet,
} from "@/types";

interface SettingsShellCardProps {
  title: string;
  subtitle: string;
}

interface SettingsContentProps {
  settings: AppSettings;
  onUpdateSettings: (update: Partial<AppSettings>) => void;
  bodyRef?: RefObject<HTMLDivElement | null>;
}

interface SettingsToggleFieldProps {
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

const SHELL_SECTIONS: SettingsShellCardProps[] = [
  {
    title: "Data",
    subtitle: "Reset all progress with destructive confirmation.",
  },
];

const PIECE_SET_LABELS: Record<PieceSet, string> = {
  cburnett: "cburnett",
  merida: "merida",
  alpha: "alpha",
  staunty: "staunty",
};

const OVERALL_THEME_LABELS: Record<OverallTheme, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

const BOARD_THEME_LABELS: Record<BoardTheme, string> = {
  brown: "Brown",
  blue: "Blue",
  green: "Green",
  gray: "Gray",
};

const BOARD_THEME_SWATCHES: Record<BoardTheme, { light: string; dark: string }> = {
  brown: {
    light: "var(--color-board-theme-brown-light)",
    dark: "var(--color-board-theme-brown-dark)",
  },
  blue: {
    light: "var(--color-board-theme-blue-light)",
    dark: "var(--color-board-theme-blue-dark)",
  },
  green: {
    light: "var(--color-board-theme-green-light)",
    dark: "var(--color-board-theme-green-dark)",
  },
  gray: {
    light: "var(--color-board-theme-gray-light)",
    dark: "var(--color-board-theme-gray-dark)",
  },
};

const BUY_ME_A_COFFEE_URL =
  import.meta.env.VITE_BUY_ME_A_COFFEE_URL?.trim() || "https://buymeacoffee.com/zugzwang";
const APP_VERSION = import.meta.env.VITE_APP_VERSION?.trim() || "1.0";

function SettingsShellCard({ title, subtitle }: SettingsShellCardProps) {
  return (
    <section className="ui-settings-shell-card">
      <h2 className="ui-settings-shell-title">{title}</h2>
      <p className="ui-settings-shell-subtitle">{subtitle}</p>
    </section>
  );
}

function SettingsToggleField({
  title,
  subtitle,
  checked,
  onToggle,
}: SettingsToggleFieldProps) {
  return (
    <div className="ui-settings-control ui-settings-control-toggle">
      <div className="ui-settings-control-copy">
        <h3 className="ui-settings-control-title">{title}</h3>
        <p className="ui-settings-control-subtitle">{subtitle}</p>
      </div>
      <button
        type="button"
        className="ui-settings-toggle"
        role="switch"
        aria-label={title}
        aria-checked={checked}
        data-checked={checked || undefined}
        onClick={() => onToggle(!checked)}
      >
        <span className="ui-settings-toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsContent({
  settings,
  onUpdateSettings,
  bodyRef,
}: SettingsContentProps) {
  const animationControlId = useId();
  const animationLabel = settings.animationSpeed === 0 ? "Off" : `${settings.animationSpeed}ms`;
  const puzzleCountLabel = new Intl.NumberFormat("en-US").format(TOTAL_PUZZLES);

  return (
    <div className="ui-settings-root">
      <div className="ui-settings-body" ref={bodyRef}>
        <section className="ui-settings-card" aria-labelledby="board-settings-title">
          <header className="ui-settings-section-head">
            <h2 className="ui-settings-section-title" id="board-settings-title">
              Board
            </h2>
            <p className="ui-settings-section-subtitle">
              Changes apply immediately and are saved automatically.
            </p>
          </header>

          <div className="ui-settings-control">
            <div className="ui-settings-control-copy">
              <h3 className="ui-settings-control-title">App Theme</h3>
              <p className="ui-settings-control-subtitle">
                Set overall app appearance.
              </p>
            </div>
            <div className="ui-settings-chip-row" role="group" aria-label="App theme">
              {OVERALL_THEMES.map((overallTheme) => {
                const isActive = settings.overallTheme === overallTheme;
                return (
                  <button
                    key={overallTheme}
                    type="button"
                    className="ui-settings-chip ui-settings-theme-chip"
                    data-active={isActive || undefined}
                    aria-pressed={isActive}
                    onClick={() => onUpdateSettings({ overallTheme })}
                  >
                    <span>{OVERALL_THEME_LABELS[overallTheme]}</span>
                    {isActive ? (
                      <span className="ui-settings-chip-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ui-settings-control">
            <div className="ui-settings-control-copy">
              <h3 className="ui-settings-control-title">Piece Set</h3>
              <p className="ui-settings-control-subtitle">
                Choose piece artwork style.
              </p>
            </div>
            <div className="ui-settings-chip-row" role="group" aria-label="Piece set">
              {PIECE_SETS.map((pieceSet) => {
                const isActive = settings.pieceSet === pieceSet;
                return (
                  <button
                    key={pieceSet}
                    type="button"
                    className="ui-settings-chip"
                    data-active={isActive || undefined}
                    aria-pressed={isActive}
                    onClick={() => onUpdateSettings({ pieceSet })}
                  >
                    <span>{PIECE_SET_LABELS[pieceSet]}</span>
                    {isActive ? (
                      <span className="ui-settings-chip-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ui-settings-control">
            <div className="ui-settings-control-copy">
              <h3 className="ui-settings-control-title">Board Theme</h3>
              <p className="ui-settings-control-subtitle">
                Pick light and dark square colors.
              </p>
            </div>
            <div className="ui-settings-chip-row" role="group" aria-label="Board theme">
              {BOARD_THEMES.map((theme) => {
                const swatch = BOARD_THEME_SWATCHES[theme];
                const isActive = settings.boardTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    className="ui-settings-chip ui-settings-theme-chip"
                    data-active={isActive || undefined}
                    aria-pressed={isActive}
                    onClick={() => onUpdateSettings({ boardTheme: theme })}
                  >
                    <span className="ui-settings-theme-swatch" aria-hidden="true">
                      <span
                        className="ui-settings-theme-swatch-square"
                        style={{ backgroundColor: swatch.light }}
                      />
                      <span
                        className="ui-settings-theme-swatch-square"
                        style={{ backgroundColor: swatch.dark }}
                      />
                    </span>
                    <span>{BOARD_THEME_LABELS[theme]}</span>
                    {isActive ? (
                      <span className="ui-settings-chip-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <SettingsToggleField
            title="Coordinates"
            subtitle="Show rank and file labels around the board."
            checked={settings.coordinates}
            onToggle={(next) => onUpdateSettings({ coordinates: next })}
          />

          <SettingsToggleField
            title="Show Legal Moves"
            subtitle="Display legal destination dots after selecting a piece."
            checked={settings.showLegalMoves}
            onToggle={(next) => onUpdateSettings({ showLegalMoves: next })}
          />

          <SettingsToggleField
            title="Highlight Last Move"
            subtitle="Highlight origin and destination squares of the last move."
            checked={settings.highlightLastMove}
            onToggle={(next) => onUpdateSettings({ highlightLastMove: next })}
          />

          <div className="ui-settings-control ui-settings-control-slider">
            <div className="ui-settings-slider-head">
              <label className="ui-settings-control-title" htmlFor={animationControlId}>
                Animation Speed
              </label>
              <span className="ui-settings-slider-value">{animationLabel}</span>
            </div>
            <p className="ui-settings-control-subtitle">
              Set to Off for instant piece movement.
            </p>
            <input
              id={animationControlId}
              className="ui-settings-slider"
              type="range"
              min={ANIMATION_SPEED_MIN_MS}
              max={ANIMATION_SPEED_MAX_MS}
              step={ANIMATION_SPEED_STEP_MS}
              value={settings.animationSpeed}
              aria-valuemin={ANIMATION_SPEED_MIN_MS}
              aria-valuemax={ANIMATION_SPEED_MAX_MS}
              aria-valuenow={settings.animationSpeed}
              onChange={(event) =>
                onUpdateSettings({ animationSpeed: Number(event.currentTarget.value) })
              }
            />
          </div>
        </section>

        <section className="ui-settings-card" aria-labelledby="puzzle-settings-title">
          <header className="ui-settings-section-head">
            <h2 className="ui-settings-section-title" id="puzzle-settings-title">
              Puzzle
            </h2>
            <p className="ui-settings-section-subtitle">
              Puzzle behavior and feedback controls.
            </p>
          </header>

          <SettingsToggleField
            title="Timer"
            subtitle="Show or hide the solve timer while still tracking time in the background."
            checked={settings.timer}
            onToggle={(next) => onUpdateSettings({ timer: next })}
          />

          <SettingsToggleField
            title="Sound Effects"
            subtitle="Enable or mute app sounds for move and solve feedback."
            checked={settings.soundEffects}
            onToggle={(next) => onUpdateSettings({ soundEffects: next })}
          />

          <SettingsToggleField
            title="Auto-Advance on Solve"
            subtitle="Move to the next puzzle automatically after a successful solve."
            checked={settings.autoAdvanceToNextPuzzle}
            onToggle={(next) => onUpdateSettings({ autoAdvanceToNextPuzzle: next })}
          />
        </section>

        {SHELL_SECTIONS.map((section) => (
          <SettingsShellCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
          />
        ))}

        <a
          className="ui-settings-support-card"
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Buy me a coffee"
        >
          <span className="ui-settings-support-icon" aria-hidden="true">
            ☕
          </span>
          <span className="ui-settings-support-copy">
            <span className="ui-settings-support-title">Buy me a coffee</span>
            <span className="ui-settings-support-subtitle">
              Support Zugzwang&apos;s development
            </span>
          </span>
          <span className="ui-settings-support-chevron" aria-hidden="true">
            ›
          </span>
        </a>

        <p className="ui-settings-meta">
          zugzwang v{APP_VERSION} · {puzzleCountLabel} puzzles
        </p>
      </div>
    </div>
  );
}
