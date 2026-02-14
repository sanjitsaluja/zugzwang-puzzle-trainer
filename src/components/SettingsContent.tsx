import type { RefObject } from "react";

interface SettingsShellCardProps {
  title: string;
  subtitle: string;
}

interface SettingsContentProps {
  bodyRef?: RefObject<HTMLDivElement | null>;
}

const SHELL_SECTIONS: SettingsShellCardProps[] = [
  {
    title: "Board",
    subtitle: "Piece set, board theme, coordinates, legal-move dots, and animation speed.",
  },
  {
    title: "Puzzle",
    subtitle: "Timer visibility and sound toggles.",
  },
  {
    title: "Data",
    subtitle: "Reset all progress with destructive confirmation.",
  },
];

function SettingsShellCard({ title, subtitle }: SettingsShellCardProps) {
  return (
    <section className="ui-settings-shell-card">
      <h2 className="ui-settings-shell-title">{title}</h2>
      <p className="ui-settings-shell-subtitle">{subtitle}</p>
    </section>
  );
}

export function SettingsContent({ bodyRef }: SettingsContentProps) {
  return (
    <div className="ui-settings-root">
      <div className="ui-settings-body" ref={bodyRef}>
        {SHELL_SECTIONS.map((section) => (
          <SettingsShellCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
          />
        ))}
      </div>
    </div>
  );
}
