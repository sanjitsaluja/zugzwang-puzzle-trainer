import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStats } from "@/hooks/useStats";
import { StatsManager, type PuzzleDataProvider } from "@/lib/stats-manager";

describe("useStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  it("keeps one manager instance across provider changes and reclassifies stats in memory", () => {
    const providerA: PuzzleDataProvider = {
      getMateIn(): number {
        return 1;
      },
      getTotalCount(): number {
        return 5;
      },
    };

    const providerB: PuzzleDataProvider = {
      getMateIn(): number {
        return 2;
      },
      getTotalCount(): number {
        return 5;
      },
    };

    const { result, rerender } = renderHook(
      ({ provider }) => useStats(provider),
      { initialProps: { provider: providerA } },
    );
    const initialManager = result.current.manager;

    act(() => {
      result.current.recordAttempt(1, 1200, true);
    });
    expect(localStorage.getItem(StatsManager.STORAGE_KEY)).toBeNull();

    rerender({ provider: providerB });
    expect(result.current.manager).toBe(initialManager);

    const mateInOne = result.current.typeStats.find((stat) => stat.mateIn === 1);
    const mateInTwo = result.current.typeStats.find((stat) => stat.mateIn === 2);

    expect(mateInOne?.solved).toBe(0);
    expect(mateInTwo?.solved).toBe(1);

    act(() => {
      vi.advanceTimersByTime(StatsManager.DEBOUNCE_MS);
    });

    const stored = JSON.parse(localStorage.getItem(StatsManager.STORAGE_KEY) ?? "{}") as {
      history?: Array<{ p: number }>;
    };
    expect(stored.history?.map((attempt) => attempt.p)).toEqual([1]);
  });

  it("flushes pending writes on unmount", () => {
    const provider: PuzzleDataProvider = {
      getMateIn(): number {
        return 1;
      },
      getTotalCount(): number {
        return 5;
      },
    };

    const { result, unmount } = renderHook(() => useStats(provider));

    act(() => {
      result.current.recordAttempt(1, 1200, true);
    });
    expect(localStorage.getItem(StatsManager.STORAGE_KEY)).toBeNull();

    unmount();

    const stored = JSON.parse(localStorage.getItem(StatsManager.STORAGE_KEY) ?? "{}") as {
      history?: Array<{ p: number }>;
    };
    expect(stored.history?.map((attempt) => attempt.p)).toEqual([1]);
  });
});
