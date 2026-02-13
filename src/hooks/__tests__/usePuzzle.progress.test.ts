import { describe, expect, it } from "vitest";
import {
  buildCompletionProgressUpdate,
  buildFailureProgressUpdate,
} from "../usePuzzle";
import type { PuzzleState } from "@/types";

describe("usePuzzle progress updates", () => {
  it("increments failCount immediately on first miss", () => {
    const previous: PuzzleState = {
      status: "unattempted",
      timeMs: null,
      attempts: 0,
      successCount: 0,
      failCount: 1,
    };

    expect(buildFailureProgressUpdate(previous)).toEqual({
      status: "fail",
      failCount: 2,
    });
  });

  it("keeps failCount stable on failed completion", () => {
    const previous: PuzzleState = {
      status: "fail",
      timeMs: null,
      attempts: 2,
      successCount: 0,
      failCount: 3,
    };

    expect(buildCompletionProgressUpdate(previous, false, 8000)).toEqual({
      status: "fail",
      timeMs: 8000,
      attempts: 3,
      successCount: 0,
      failCount: 3,
    });
  });

  it("increments successCount and attempts on successful completion", () => {
    const previous: PuzzleState = {
      status: "fail",
      timeMs: 12000,
      attempts: 4,
      successCount: 1,
      failCount: 3,
    };

    expect(buildCompletionProgressUpdate(previous, true, 5000)).toEqual({
      status: "success",
      timeMs: 5000,
      attempts: 5,
      successCount: 2,
      failCount: 3,
    });
  });
});
