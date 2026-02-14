import { describe, expect, it } from "vitest";
import { ChessGame } from "../chess";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Puzzle 1 from Susan Polgar: white Qf6, Bc3, Kg1 vs black Qd8, Rf8, Kg8 — Qxg7# is mate
const PUZZLE_1_FEN = "3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 1";

// Fool's mate: 1.f3 e5 2.g4 Qh4# — black has just delivered checkmate
const FOOLS_MATE_FEN = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

// Position with check: white king on e1, black queen on e2 giving check
const CHECK_FEN = "4k3/8/8/8/8/8/4q3/4K3 w - - 0 1";

describe("ChessGame", () => {
  describe("constructor", () => {
    it("creates a game from a valid FEN", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.fen).toBe(STARTING_FEN);
    });

    it("throws on invalid FEN", () => {
      expect(() => new ChessGame("not-a-fen")).toThrow();
    });
  });

  describe("sideToMove", () => {
    it("returns 'w' when white to move", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.sideToMove).toBe("w");
    });

    it("returns 'b' when black to move", () => {
      const blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      const game = new ChessGame(blackToMove);
      expect(game.sideToMove).toBe("b");
    });
  });

  describe("turnColor", () => {
    it("returns 'white' when white to move", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.turnColor).toBe("white");
    });

    it("returns 'black' when black to move", () => {
      const blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      const game = new ChessGame(blackToMove);
      expect(game.turnColor).toBe("black");
    });
  });

  describe("isCheckmate", () => {
    it("returns true for a checkmate position", () => {
      const game = new ChessGame(FOOLS_MATE_FEN);
      expect(game.isCheckmate).toBe(true);
    });

    it("returns false for the starting position", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.isCheckmate).toBe(false);
    });
  });

  describe("isCheck", () => {
    it("returns true when king is in check", () => {
      const game = new ChessGame(CHECK_FEN);
      expect(game.isCheck).toBe(true);
    });

    it("returns false for the starting position", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.isCheck).toBe(false);
    });
  });

  describe("isGameOver", () => {
    it("returns true for checkmate", () => {
      const game = new ChessGame(FOOLS_MATE_FEN);
      expect(game.isGameOver).toBe(true);
    });

    it("returns false for starting position", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.isGameOver).toBe(false);
    });
  });

  describe("getLegalDests", () => {
    it("returns correct dests for starting position", () => {
      const game = new ChessGame(STARTING_FEN);
      const dests = game.getLegalDests();

      expect(dests.get("e2")).toEqual(expect.arrayContaining(["e3", "e4"]));
      expect(dests.get("g1")).toEqual(expect.arrayContaining(["f3", "h3"]));
      expect(dests.has("e7")).toBe(false);
    });

    it("returns empty map for checkmate position", () => {
      const game = new ChessGame(FOOLS_MATE_FEN);
      const dests = game.getLegalDests();
      expect(dests.size).toBe(0);
    });

    it("deduplicates promotion targets", () => {
      // White pawn on a7, can promote to a8 (4 pieces = 4 moves, but 1 dest square)
      const promoFen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
      const game = new ChessGame(promoFen);
      const dests = game.getLegalDests();
      const a7Dests = dests.get("a7");
      expect(a7Dests).toBeDefined();
      expect(a7Dests!.filter((sq) => sq === "a8")).toHaveLength(1);
    });
  });

  describe("getPromotionOptions", () => {
    it("returns all promotion pieces for a valid promotion move", () => {
      const promoFen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
      const game = new ChessGame(promoFen);
      expect(game.getPromotionOptions("a7", "a8")).toEqual(["q", "r", "b", "n"]);
    });

    it("returns empty array for non-promotion moves", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.getPromotionOptions("e2", "e4")).toEqual([]);
    });
  });

  describe("makeMove", () => {
    it("applies a legal move and returns SAN", () => {
      const game = new ChessGame(STARTING_FEN);
      const san = game.makeMove("e2", "e4");
      expect(san).toBe("e4");
      expect(game.sideToMove).toBe("b");
    });

    it("returns null for an illegal move", () => {
      const game = new ChessGame(STARTING_FEN);
      const san = game.makeMove("e2", "e5");
      expect(san).toBeNull();
      expect(game.sideToMove).toBe("w");
    });

    it("returns SAN with check annotation", () => {
      // Puzzle 1: Qxg7# is checkmate
      const game = new ChessGame(PUZZLE_1_FEN);
      const san = game.makeMove("f6", "g7");
      expect(san).toBe("Qxg7#");
      expect(game.isCheckmate).toBe(true);
    });

    it("handles promotion", () => {
      const promoFen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
      const game = new ChessGame(promoFen);
      const san = game.makeMove("a7", "a8", "q");
      expect(san).toBe("a8=Q+");
    });
  });

  describe("moveToSan", () => {
    it("returns SAN without applying the move", () => {
      const game = new ChessGame(STARTING_FEN);
      const san = game.moveToSan("e2", "e4");
      expect(san).toBe("e4");
      expect(game.sideToMove).toBe("w");
    });

    it("returns null for an illegal move", () => {
      const game = new ChessGame(STARTING_FEN);
      expect(game.moveToSan("e2", "e5")).toBeNull();
    });

    it("returns SAN with check/mate annotation", () => {
      const game = new ChessGame(PUZZLE_1_FEN);
      expect(game.moveToSan("f6", "g7")).toBe("Qxg7#");
    });
  });

  describe("clone", () => {
    it("creates an independent copy", () => {
      const game = new ChessGame(STARTING_FEN);
      const copy = game.clone();

      game.makeMove("e2", "e4");
      expect(game.sideToMove).toBe("b");
      expect(copy.sideToMove).toBe("w");
      expect(copy.fen).toBe(STARTING_FEN);
    });
  });
});
