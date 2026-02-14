import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board";

const mock = vi.hoisted(() => {
  const set = vi.fn();
  const destroy = vi.fn();
  const redrawAll = vi.fn();
  const chessground = vi.fn((element: HTMLElement) => {
    element.classList.add("cg-wrap", "orientation-white", "manipulable");
    return {
      set,
      destroy,
      redrawAll,
    };
  });
  return {
    set,
    destroy,
    redrawAll,
    chessground,
  };
});

vi.mock("@lichess-org/chessground", () => ({
  Chessground: mock.chessground,
}));

describe("Board", () => {
  afterEach(() => {
    cleanup();
    mock.set.mockClear();
    mock.destroy.mockClear();
    mock.redrawAll.mockClear();
    mock.chessground.mockClear();
  });

  it("updates theme/piece-set classes without dropping chessground runtime classes", () => {
    const props = {
      fen: "8/8/8/8/8/8/8/8 w - - 0 1",
      orientation: "white" as const,
      turnColor: "white" as const,
      dests: new Map<string, string[]>(),
      interactive: true,
      pieceSet: "cburnett" as const,
      boardTheme: "brown" as const,
      coordinates: true,
      showLegalMoves: true,
      highlightLastMove: true,
      animationSpeed: 200,
      onMove: vi.fn(),
    };

    const { rerender } = render(<Board {...props} />);
    const root = document.querySelector(".ui-board-root");
    if (!(root instanceof HTMLDivElement)) {
      throw new Error("Expected board root");
    }

    expect(root.classList.contains("cg-wrap")).toBe(true);
    expect(root.classList.contains("orientation-white")).toBe(true);
    expect(root.classList.contains("ui-board-theme-brown")).toBe(true);
    expect(root.classList.contains("ui-piece-set-cburnett")).toBe(true);

    rerender(<Board {...props} boardTheme="blue" pieceSet="merida" />);

    expect(root.classList.contains("cg-wrap")).toBe(true);
    expect(root.classList.contains("orientation-white")).toBe(true);
    expect(root.classList.contains("ui-board-theme-blue")).toBe(true);
    expect(root.classList.contains("ui-piece-set-merida")).toBe(true);
    expect(root.classList.contains("ui-board-theme-brown")).toBe(false);
    expect(root.classList.contains("ui-piece-set-cburnett")).toBe(false);
  });

  it("rebuilds board wrapper when coordinates setting changes", () => {
    const props = {
      fen: "8/8/8/8/8/8/8/8 w - - 0 1",
      orientation: "white" as const,
      turnColor: "white" as const,
      dests: new Map<string, string[]>(),
      interactive: true,
      pieceSet: "cburnett" as const,
      boardTheme: "brown" as const,
      coordinates: true,
      showLegalMoves: true,
      highlightLastMove: true,
      animationSpeed: 200,
      onMove: vi.fn(),
    };

    const { rerender } = render(<Board {...props} />);
    expect(mock.redrawAll).toHaveBeenCalledTimes(0);

    rerender(<Board {...props} coordinates={false} />);
    expect(mock.redrawAll).toHaveBeenCalledTimes(1);
  });
});
