import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatsContent, type StatsContentProps } from "./Stats";

function makeProps(overrides: Partial<StatsContentProps> = {}): StatsContentProps {
  return {
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
      {
        puzzleId: 44,
        mateIn: 2,
        missCount: 1,
        lastAttemptAt: Date.now() - 3 * 60 * 60 * 1000,
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

describe("StatsContent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-14T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows retry queue first, sorted by most recent, and opens selected puzzle", () => {
    const props = makeProps();
    render(<StatsContent {...props} />);

    const puzzleTitles = screen
      .getAllByText(/Puzzle #/i)
      .map((node) => node.textContent);
    expect(puzzleTitles).toEqual(["Puzzle #31", "Puzzle #44", "Puzzle #12"]);
    expect(screen.getByText("1 hour ago")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry puzzle 31" }));
    expect(props.onOpenPuzzle).toHaveBeenCalledWith(31);
  });

  it("shows empty retry state when queue is empty", () => {
    const { container } = render(
      <StatsContent {...makeProps({ retryQueue: [] })} />,
    );

    expect(screen.getByText("All caught up!")).toBeTruthy();
    expect(screen.queryByText("Tap any puzzle to retry it.")).toBeNull();
    expect(container.querySelector(".ui-stats-tab-badge")).toBeNull();
  });

  it("renders progress tab including improvement callout and per-type empty state", () => {
    render(<StatsContent {...makeProps()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));

    expect(screen.getByText("Puzzle 47 of 4462")).toBeTruthy();
    expect(screen.getByText("83% success rate · Best streak: 12")).toBeTruthy();
    expect(screen.getByText("📈 You're improving")).toBeTruthy();
    expect(screen.getByText(/You're solving Mate in 1 puzzles/i)).toBeTruthy();
    expect(screen.getByText("no data yet")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("hides the improvement callout when there is no negative trend", () => {
    render(
      <StatsContent
        {...makeProps({
          typeStats: [
            { mateIn: 1, solved: 5, avgTimeMs: 9000, trend: 4 },
            { mateIn: 2, solved: 8, avgTimeMs: 22000, trend: null },
            { mateIn: 3, solved: 0, avgTimeMs: null, trend: null },
          ],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    expect(screen.queryByText("📈 You're improving")).toBeNull();
  });
});
