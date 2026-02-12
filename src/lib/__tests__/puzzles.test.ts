import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseMove,
  parseMoves,
  mateDepthFromType,
  getPuzzleById,
  loadPuzzles,
  _resetCache,
} from "../puzzles";
import type { PuzzleData } from "@/types";
import { TOTAL_PUZZLES } from "@/types";

// ---------------------------------------------------------------------------
// parseMove
// ---------------------------------------------------------------------------

describe("parseMove", () => {
  it("parses a standard move", () => {
    expect(parseMove("f6-g7")).toEqual({
      from: "f6",
      to: "g7",
      promotion: undefined,
    });
  });

  it("parses a move with queen promotion", () => {
    expect(parseMove("f7-f8q")).toEqual({
      from: "f7",
      to: "f8",
      promotion: "q",
    });
  });

  it("parses a move with knight promotion", () => {
    expect(parseMove("d7-e8n")).toEqual({
      from: "d7",
      to: "e8",
      promotion: "n",
    });
  });

  it("parses edge squares", () => {
    expect(parseMove("a1-h8")).toEqual({
      from: "a1",
      to: "h8",
      promotion: undefined,
    });
  });

  it("throws on missing dash", () => {
    expect(() => parseMove("f6g7")).toThrow("missing '-'");
  });

  it("throws on empty string", () => {
    expect(() => parseMove("")).toThrow("missing '-'");
  });

  it("throws on invalid from square (too long)", () => {
    expect(() => parseMove("abc-d4")).toThrow("Invalid 'from' square");
  });

  it("throws on invalid from square (bad file)", () => {
    expect(() => parseMove("z1-a2")).toThrow("Invalid 'from' square");
  });

  it("throws on invalid from square (bad rank)", () => {
    expect(() => parseMove("a9-b2")).toThrow("Invalid 'from' square");
  });

  it("throws on invalid to square (bad file)", () => {
    expect(() => parseMove("a1-z2")).toThrow("Invalid 'to' square");
  });

  it("throws on invalid to square (bad rank)", () => {
    expect(() => parseMove("a1-b0")).toThrow("Invalid 'to' square");
  });

  it("throws on invalid to portion (too long)", () => {
    expect(() => parseMove("a1-b2qr")).toThrow("Invalid 'to' portion");
  });

  it("throws on invalid to portion (too short)", () => {
    expect(() => parseMove("a1-b")).toThrow("Invalid 'to' square");
  });

  it("throws on invalid promotion piece", () => {
    expect(() => parseMove("a7-a8k")).toThrow("Invalid promotion piece");
  });

  it("accepts all valid promotion pieces", () => {
    for (const piece of ["q", "r", "b", "n"]) {
      const result = parseMove(`a7-a8${piece}`);
      expect(result.promotion).toBe(piece);
    }
  });
});

// ---------------------------------------------------------------------------
// parseMoves
// ---------------------------------------------------------------------------

describe("parseMoves", () => {
  it("parses a single move (mate in one)", () => {
    const result = parseMoves("f6-g7");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: "f6", to: "g7", promotion: undefined });
  });

  it("parses three moves (mate in two)", () => {
    const result = parseMoves("d3-c3;a3-a2;b8-b2");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ from: "d3", to: "c3", promotion: undefined });
    expect(result[1]).toEqual({ from: "a3", to: "a2", promotion: undefined });
    expect(result[2]).toEqual({ from: "b8", to: "b2", promotion: undefined });
  });

  it("parses five moves (mate in three)", () => {
    const result = parseMoves("e4-c5;b6-c5;b5-c7;c5-c7;h1-e4");
    expect(result).toHaveLength(5);
  });

  it("handles promotion within multi-move sequence", () => {
    const result = parseMoves("f7-f8q;g8-h8;h1-h8");
    expect(result[0]?.promotion).toBe("q");
    expect(result[1]?.promotion).toBeUndefined();
    expect(result[2]?.promotion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mateDepthFromType
// ---------------------------------------------------------------------------

describe("mateDepthFromType", () => {
  it("returns 1 for Mate in One", () => {
    expect(mateDepthFromType("Mate in One")).toBe(1);
  });

  it("returns 2 for Mate in Two", () => {
    expect(mateDepthFromType("Mate in Two")).toBe(2);
  });

  it("returns 3 for Mate in Three", () => {
    expect(mateDepthFromType("Mate in Three")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getPuzzleById
// ---------------------------------------------------------------------------

describe("getPuzzleById", () => {
  const puzzles: PuzzleData[] = [
    {
      problemid: 1,
      first: "White to Move",
      type: "Mate in One",
      fen: "3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 1",
      moves: "f6-g7",
    },
    {
      problemid: 2,
      first: "White to Move",
      type: "Mate in One",
      fen: "2r2rk1/2q2p1p/6pQ/4P1N1/8/8/PPP5/2KR4 w - - 0 1",
      moves: "h6-h7",
    },
  ];

  it("finds puzzle by id", () => {
    const puzzle = getPuzzleById(puzzles, 1);
    expect(puzzle?.problemid).toBe(1);
    expect(puzzle?.moves).toBe("f6-g7");
  });

  it("returns undefined for missing id", () => {
    expect(getPuzzleById(puzzles, 999)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// loadPuzzles (fetch + caching + race protection)
// ---------------------------------------------------------------------------

function makeFakePuzzle(id: number): PuzzleData {
  return {
    problemid: id,
    first: "White to Move",
    type: "Mate in One",
    fen: "3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 1",
    moves: "f6-g7",
  };
}

function fakePuzzlesResponse(): { problems: PuzzleData[] } {
  return {
    problems: Array.from({ length: TOTAL_PUZZLES }, (_, i) =>
      makeFakePuzzle(i + 1),
    ),
  };
}

describe("loadPuzzles", () => {
  beforeEach(() => {
    _resetCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetCache();
  });

  it("fetches, parses, and returns puzzles", async () => {
    const body = fakePuzzlesResponse();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const puzzles = await loadPuzzles();
    expect(puzzles).toHaveLength(TOTAL_PUZZLES);
    expect(puzzles[0]?.problemid).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("caches result — second call does not re-fetch", async () => {
    const body = fakePuzzlesResponse();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await loadPuzzles();
    await loadPuzzles();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("concurrent calls share a single fetch", async () => {
    const body = fakePuzzlesResponse();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const [a, b] = await Promise.all([loadPuzzles(), loadPuzzles()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("clears cached promise on fetch failure so retry works", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    await expect(loadPuzzles()).rejects.toThrow("network error");

    const body = fakePuzzlesResponse();
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status: 200 }),
    );
    const puzzles = await loadPuzzles();
    expect(puzzles).toHaveLength(TOTAL_PUZZLES);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );
    await expect(loadPuzzles()).rejects.toThrow("Failed to fetch puzzles: 404");
  });
});
