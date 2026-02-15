import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PuzzleInfo } from "./PuzzleInfo";

describe("PuzzleInfo", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows side-to-move by default while puzzle is in progress", () => {
    render(
      <PuzzleInfo
        puzzleId={1}
        puzzleType="Mate in Two"
        sideToMove="White to Move"
        phase="playing"
        isFailed={false}
      />,
    );

    expect(screen.getByText("White to move")).toBeTruthy();
    expect(screen.queryByText("Loading engine...")).toBeNull();
  });

  it("shows loading status in the header while waiting for engine validation", () => {
    render(
      <PuzzleInfo
        puzzleId={1}
        puzzleType="Mate in Two"
        sideToMove="White to Move"
        phase="validating"
        isFailed={false}
        isAwaitingEngineMove
      />,
    );

    expect(screen.getByText("Loading engine...")).toBeTruthy();
    expect(screen.queryByText("White to move")).toBeNull();
  });

  it("shows solved status on successful completion", () => {
    render(
      <PuzzleInfo
        puzzleId={1}
        puzzleType="Mate in Two"
        sideToMove="White to Move"
        phase="complete"
        isFailed={false}
      />,
    );

    expect(screen.getByText("Solved")).toBeTruthy();
  });
});
