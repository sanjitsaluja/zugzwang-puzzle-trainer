import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useStats } from "@/hooks/useStats";
import { StatsManager, type PuzzleDataProvider } from "@/lib/stats-manager";

describe("useStats", () => {
  beforeEach(() => {
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(StatsManager.STORAGE_KEY);
  });

  it("recreates manager when puzzle provider changes without losing pending stats", () => {
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

    act(() => {
      result.current.recordAttempt(1, 1200, true);
    });

    rerender({ provider: providerB });

    const mateInOne = result.current.typeStats.find((stat) => stat.mateIn === 1);
    const mateInTwo = result.current.typeStats.find((stat) => stat.mateIn === 2);

    expect(mateInOne?.solved).toBe(0);
    expect(mateInTwo?.solved).toBe(1);
  });
});
