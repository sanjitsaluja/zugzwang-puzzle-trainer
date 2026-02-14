import { useCallback, useEffect, useRef, useState } from "react";
import { PuzzleTimer } from "@/lib/timer";

export function useTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<PuzzleTimer>(null);

  if (timerRef.current === null) {
    timerRef.current = new PuzzleTimer(setElapsedMs);
  }

  useEffect(() => {
    return () => timerRef.current?.dispose();
  }, []);

  const start = useCallback(() => {
    timerRef.current?.start();
  }, []);

  const stop = useCallback((): number => {
    return timerRef.current?.stop() ?? 0;
  }, []);

  const reset = useCallback(() => {
    timerRef.current?.reset();
  }, []);

  const hydrate = useCallback((nextElapsedMs: number, shouldRun: boolean) => {
    timerRef.current?.hydrate(nextElapsedMs, shouldRun);
  }, []);

  return {
    elapsedMs,
    formatted: PuzzleTimer.formatTime(elapsedMs),
    isRunning: timerRef.current.isRunning,
    start,
    stop,
    reset,
    hydrate,
  };
}
