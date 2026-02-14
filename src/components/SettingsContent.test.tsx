import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings } from "@/lib/persistence";
import type { AppSettings } from "@/types";
import { SettingsContent } from "./SettingsContent";

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...defaultAppSettings(),
    ...overrides,
  };
}

describe("SettingsContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("updates piece set and board theme selections", () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsContent settings={makeSettings()} onUpdateSettings={onUpdateSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "merida" }));
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));

    expect(onUpdateSettings).toHaveBeenCalledWith({ pieceSet: "merida" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ boardTheme: "blue" });
  });

  it("toggles board switches", () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsContent settings={makeSettings()} onUpdateSettings={onUpdateSettings} />);

    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    fireEvent.click(screen.getByRole("switch", { name: "Show Legal Moves" }));
    fireEvent.click(screen.getByRole("switch", { name: "Highlight Last Move" }));

    expect(onUpdateSettings).toHaveBeenCalledWith({ coordinates: false });
    expect(onUpdateSettings).toHaveBeenCalledWith({ showLegalMoves: false });
    expect(onUpdateSettings).toHaveBeenCalledWith({ highlightLastMove: false });
  });

  it("updates animation speed and shows Off for zero", () => {
    const onUpdateSettings = vi.fn();
    const { rerender } = render(
      <SettingsContent settings={makeSettings({ animationSpeed: 200 })} onUpdateSettings={onUpdateSettings} />,
    );

    expect(screen.getByText("200ms")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Animation Speed"), { target: { value: "0" } });
    expect(onUpdateSettings).toHaveBeenCalledWith({ animationSpeed: 0 });

    rerender(
      <SettingsContent settings={makeSettings({ animationSpeed: 0 })} onUpdateSettings={onUpdateSettings} />,
    );
    expect(screen.getByText("Off")).toBeTruthy();
  });
});
