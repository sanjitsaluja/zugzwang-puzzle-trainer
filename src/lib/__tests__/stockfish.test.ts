import { describe, it, expect } from "vitest";
import { parseBestMove, parseInfoLine, uciToParsedMove } from "@/lib/stockfish";

describe("parseBestMove", () => {
  it("parses a standard best move", () => {
    expect(parseBestMove("bestmove e2e4")).toBe("e2e4");
  });

  it("parses best move with ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toBe("e2e4");
  });

  it("returns null for bestmove (none)", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
  });

  it("returns undefined for non-bestmove lines", () => {
    expect(parseBestMove("info depth 15 score mate 2")).toBeUndefined();
    expect(parseBestMove("uciok")).toBeUndefined();
    expect(parseBestMove("readyok")).toBeUndefined();
    expect(parseBestMove("")).toBeUndefined();
  });

  it("parses promotion moves", () => {
    expect(parseBestMove("bestmove a7a8q")).toBe("a7a8q");
  });
});

describe("parseInfoLine", () => {
  it("parses mate score with PV", () => {
    const result = parseInfoLine(
      "info depth 15 seldepth 20 score mate 2 pv e2e4 e7e5 d1h5",
    );
    expect(result).toEqual({
      depth: 15,
      score: { type: "mate", value: 2 },
      pv: ["e2e4", "e7e5", "d1h5"],
    });
  });

  it("parses negative mate score (opponent mates)", () => {
    const result = parseInfoLine("info depth 12 score mate -3 pv e7e5");
    expect(result).toEqual({
      depth: 12,
      score: { type: "mate", value: -3 },
      pv: ["e7e5"],
    });
  });

  it("parses centipawn score", () => {
    const result = parseInfoLine("info depth 20 score cp 150 pv d2d4 d7d5");
    expect(result).toEqual({
      depth: 20,
      score: { type: "cp", value: 150 },
      pv: ["d2d4", "d7d5"],
    });
  });

  it("parses negative centipawn score", () => {
    const result = parseInfoLine("info depth 10 score cp -82 pv e7e5");
    expect(result).toEqual({
      depth: 10,
      score: { type: "cp", value: -82 },
      pv: ["e7e5"],
    });
  });

  it("parses info line without PV", () => {
    const result = parseInfoLine("info depth 5 score cp 30");
    expect(result).toEqual({
      depth: 5,
      score: { type: "cp", value: 30 },
      pv: [],
    });
  });

  it("parses info line without score", () => {
    const result = parseInfoLine("info depth 1 seldepth 1 nodes 20");
    expect(result).toEqual({
      depth: 1,
      score: null,
      pv: [],
    });
  });

  it("returns null for non-info lines", () => {
    expect(parseInfoLine("bestmove e2e4")).toBeNull();
    expect(parseInfoLine("uciok")).toBeNull();
    expect(parseInfoLine("readyok")).toBeNull();
    expect(parseInfoLine("")).toBeNull();
  });

  it("returns null for info lines without depth", () => {
    expect(parseInfoLine("info string hello")).toBeNull();
  });

  it("parses mate in 1", () => {
    const result = parseInfoLine("info depth 15 score mate 1 pv f6g7");
    expect(result).toEqual({
      depth: 15,
      score: { type: "mate", value: 1 },
      pv: ["f6g7"],
    });
  });

  it("parses zero centipawn score", () => {
    const result = parseInfoLine("info depth 10 score cp 0 pv e2e4");
    expect(result).toEqual({
      depth: 10,
      score: { type: "cp", value: 0 },
      pv: ["e2e4"],
    });
  });
});

describe("uciToParsedMove", () => {
  it("converts a standard move", () => {
    expect(uciToParsedMove("e2e4")).toEqual({
      from: "e2",
      to: "e4",
      promotion: undefined,
    });
  });

  it("converts a move with queen promotion", () => {
    expect(uciToParsedMove("a7a8q")).toEqual({
      from: "a7",
      to: "a8",
      promotion: "q",
    });
  });

  it("converts a move with knight promotion", () => {
    expect(uciToParsedMove("b2b1n")).toEqual({
      from: "b2",
      to: "b1",
      promotion: "n",
    });
  });

  it("ignores invalid promotion characters", () => {
    expect(uciToParsedMove("e7e8x")).toEqual({
      from: "e7",
      to: "e8",
      promotion: undefined,
    });
  });
});
