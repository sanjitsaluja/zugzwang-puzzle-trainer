const TICK_INTERVAL_MS = 100;

export class PuzzleTimer {
  private startTime: number | null = null;
  private accumulated = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly onTick: (elapsedMs: number) => void;

  constructor(onTick: (elapsedMs: number) => void) {
    this.onTick = onTick;
  }

  get elapsedMs(): number {
    if (this.startTime === null) return this.accumulated;
    return this.accumulated + (Date.now() - this.startTime);
  }

  get isRunning(): boolean {
    return this.startTime !== null;
  }

  start(): void {
    if (this.isRunning) return;
    this.startTime = Date.now();
    this.intervalId = setInterval(() => {
      this.onTick(this.elapsedMs);
    }, TICK_INTERVAL_MS);
  }

  stop(): number {
    if (!this.isRunning) return this.accumulated;
    this.accumulated += Date.now() - this.startTime!;
    this.startTime = null;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onTick(this.accumulated);
    return this.accumulated;
  }

  reset(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.startTime = null;
    this.accumulated = 0;
    this.onTick(0);
  }

  dispose(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}
