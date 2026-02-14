import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings } from "@/lib/persistence";
import { MenuModal } from "./MenuModal";

type MenuModalProps = ComponentProps<typeof MenuModal>;

function makeProps(overrides: Partial<MenuModalProps> = {}): MenuModalProps {
  return {
    open: true,
    requestedTab: "stats",
    onTabChange: vi.fn(),
    onClose: vi.fn(),
    settings: defaultAppSettings(),
    onUpdateSettings: vi.fn(),
    onOpenPuzzle: vi.fn(),
    solved: 38,
    retryQueue: [
      {
        puzzleId: 12,
        mateIn: 1,
        missCount: 3,
        lastAttemptAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        puzzleId: 31,
        mateIn: 2,
        missCount: 2,
        lastAttemptAt: Date.now() - 60 * 60 * 1000,
      },
    ],
    currentStreak: 5,
    bestStreak: 12,
    successRate: 83,
    currentPuzzle: 47,
    totalPuzzles: 4462,
    typeStats: [
      { mateIn: 1, solved: 25, avgTimeMs: 8000, trend: -22 },
      { mateIn: 2, solved: 10, avgTimeMs: 24000, trend: -12 },
      { mateIn: 3, solved: 0, avgTimeMs: null, trend: null },
    ],
    ...overrides,
  };
}

describe("MenuModal", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("opens to Stats and updates title when switching segments", () => {
    const props = makeProps();
    render(<MenuModal {...props} />);

    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(props.onTabChange).toHaveBeenCalledWith("settings");
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    expect(props.onTabChange).toHaveBeenCalledWith("stats");
  });

  it("preserves scroll position for each top-level tab", () => {
    render(<MenuModal {...makeProps()} />);

    const statsBody = document.querySelector(".ui-stats-body");
    if (!(statsBody instanceof HTMLElement)) {
      throw new Error("Expected stats body");
    }
    statsBody.scrollTop = 120;

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    const settingsBody = document.querySelector(".ui-settings-body");
    if (!(settingsBody instanceof HTMLDivElement)) {
      throw new Error("Expected settings body");
    }
    settingsBody.scrollTop = 80;

    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    const restoredStatsBody = document.querySelector(".ui-stats-body");
    if (!(restoredStatsBody instanceof HTMLElement)) {
      throw new Error("Expected restored stats body");
    }
    expect(restoredStatsBody.scrollTop).toBe(120);

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    const restoredSettingsBody = document.querySelector(".ui-settings-body");
    if (!(restoredSettingsBody instanceof HTMLDivElement)) {
      throw new Error("Expected restored settings body");
    }
    expect(restoredSettingsBody.scrollTop).toBe(80);
  });

  it("resets to Stats when reopened", () => {
    vi.useFakeTimers();
    const props = makeProps();
    const { rerender } = render(<MenuModal {...props} />);

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();

    rerender(<MenuModal {...props} open={false} />);
    vi.advanceTimersByTime(200);

    rerender(<MenuModal {...props} open />);
    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Stats" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("follows requestedTab prop while open", () => {
    const props = makeProps();
    const { rerender } = render(<MenuModal {...props} />);

    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    rerender(<MenuModal {...props} requestedTab="settings" />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
  });
});
