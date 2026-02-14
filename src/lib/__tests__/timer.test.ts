import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzleTimer } from "../timer";

describe("PuzzleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts at 0ms and not running", () => {
      const timer = new PuzzleTimer(() => {});
      expect(timer.elapsedMs).toBe(0);
      expect(timer.isRunning).toBe(false);
    });
  });

  describe("start/stop", () => {
    it("tracks elapsed time", () => {
      const ticks: number[] = [];
      const timer = new PuzzleTimer((ms) => ticks.push(ms));

      timer.start();
      expect(timer.isRunning).toBe(true);

      vi.advanceTimersByTime(1000);
      const elapsed = timer.stop();

      expect(timer.isRunning).toBe(false);
      expect(elapsed).toBe(1000);
      expect(timer.elapsedMs).toBe(1000);
    });

    it("accumulates across multiple start/stop cycles", () => {
      const timer = new PuzzleTimer(() => {});

      timer.start();
      vi.advanceTimersByTime(500);
      timer.stop();

      timer.start();
      vi.advanceTimersByTime(300);
      const elapsed = timer.stop();

      expect(elapsed).toBe(800);
    });

    it("start is a no-op when already running", () => {
      const timer = new PuzzleTimer(() => {});
      timer.start();
      vi.advanceTimersByTime(500);
      timer.start();
      vi.advanceTimersByTime(500);
      const elapsed = timer.stop();
      expect(elapsed).toBe(1000);
    });

    it("stop is a no-op when already stopped", () => {
      const timer = new PuzzleTimer(() => {});
      timer.start();
      vi.advanceTimersByTime(500);
      timer.stop();
      const secondStop = timer.stop();
      expect(secondStop).toBe(500);
    });
  });

  describe("reset", () => {
    it("clears elapsed time and stops the timer", () => {
      const ticks: number[] = [];
      const timer = new PuzzleTimer((ms) => ticks.push(ms));

      timer.start();
      vi.advanceTimersByTime(1000);
      timer.reset();

      expect(timer.elapsedMs).toBe(0);
      expect(timer.isRunning).toBe(false);
      expect(ticks[ticks.length - 1]).toBe(0);
    });

    it("allows restarting after reset", () => {
      const timer = new PuzzleTimer(() => {});

      timer.start();
      vi.advanceTimersByTime(1000);
      timer.reset();

      timer.start();
      vi.advanceTimersByTime(500);
      const elapsed = timer.stop();
      expect(elapsed).toBe(500);
    });
  });

  describe("hydrate", () => {
    it("restores elapsed time without running", () => {
      const timer = new PuzzleTimer(() => {});
      timer.hydrate(2300, false);

      expect(timer.elapsedMs).toBe(2300);
      expect(timer.isRunning).toBe(false);
    });

    it("restores elapsed time and resumes running when requested", () => {
      const timer = new PuzzleTimer(() => {});
      timer.hydrate(1200, true);

      vi.advanceTimersByTime(300);
      const elapsed = timer.stop();

      expect(elapsed).toBe(1500);
      expect(timer.isRunning).toBe(false);
    });
  });

  describe("onTick callback", () => {
    it("fires at regular intervals while running", () => {
      const ticks: number[] = [];
      const timer = new PuzzleTimer((ms) => ticks.push(ms));

      timer.start();
      vi.advanceTimersByTime(350);
      timer.stop();

      // 100ms interval → ticks at 100, 200, 300 (3 interval fires) + 1 from stop()
      const intervalTicks = ticks.slice(0, -1);
      expect(intervalTicks.length).toBe(3);
      expect(intervalTicks[0]).toBe(100);
      expect(intervalTicks[1]).toBe(200);
      expect(intervalTicks[2]).toBe(300);
    });

    it("fires final tick on stop with exact elapsed time", () => {
      const ticks: number[] = [];
      const timer = new PuzzleTimer((ms) => ticks.push(ms));

      timer.start();
      vi.advanceTimersByTime(550);
      timer.stop();

      expect(ticks[ticks.length - 1]).toBe(550);
    });
  });

  describe("dispose", () => {
    it("clears the interval without resetting time", () => {
      const ticks: number[] = [];
      const timer = new PuzzleTimer((ms) => ticks.push(ms));

      timer.start();
      vi.advanceTimersByTime(500);
      const ticksBefore = ticks.length;
      timer.dispose();

      vi.advanceTimersByTime(500);
      expect(ticks.length).toBe(ticksBefore);
    });
  });

  describe("formatTime", () => {
    it("formats 0ms as 00:00", () => {
      expect(PuzzleTimer.formatTime(0)).toBe("00:00");
    });

    it("formats seconds correctly", () => {
      expect(PuzzleTimer.formatTime(5000)).toBe("00:05");
    });

    it("formats minutes and seconds", () => {
      expect(PuzzleTimer.formatTime(83000)).toBe("01:23");
    });

    it("pads single-digit values", () => {
      expect(PuzzleTimer.formatTime(61000)).toBe("01:01");
    });

    it("handles large values", () => {
      expect(PuzzleTimer.formatTime(3661000)).toBe("61:01");
    });

    it("truncates sub-second precision", () => {
      expect(PuzzleTimer.formatTime(999)).toBe("00:00");
      expect(PuzzleTimer.formatTime(1500)).toBe("00:01");
    });
  });
});
