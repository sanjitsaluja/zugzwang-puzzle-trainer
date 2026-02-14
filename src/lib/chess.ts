import { Chess, type Square } from "chess.js";
import type { BoardColor } from "@/types";
import { PROMOTION_PIECES, type PromotionPiece } from "@/types";

const VALID_PROMOTIONS = new Set<string>(PROMOTION_PIECES);

export class ChessGame {
  private chess: Chess;

  constructor(fen: string) {
    this.chess = new Chess(fen);
  }

  get fen(): string {
    return this.chess.fen();
  }

  get sideToMove(): "w" | "b" {
    return this.chess.turn();
  }

  get turnColor(): BoardColor {
    return this.chess.turn() === "w" ? "white" : "black";
  }

  get isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  get isCheck(): boolean {
    return this.chess.isCheck();
  }

  get isDraw(): boolean {
    return this.chess.isDraw();
  }

  get isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getLegalDests(): Map<string, string[]> {
    const dests = new Map<string, string[]>();
    for (const move of this.chess.moves({ verbose: true })) {
      const targets = dests.get(move.from);
      if (targets) {
        if (!targets.includes(move.to)) targets.push(move.to);
      } else {
        dests.set(move.from, [move.to]);
      }
    }
    return dests;
  }

  getPromotionOptions(from: string, to: string): PromotionPiece[] {
    const found = new Set<PromotionPiece>();
    for (const move of this.chess.moves({ verbose: true })) {
      if (
        move.from === from &&
        move.to === to &&
        move.promotion !== undefined &&
        VALID_PROMOTIONS.has(move.promotion)
      ) {
        found.add(move.promotion as PromotionPiece);
      }
    }
    return PROMOTION_PIECES.filter((piece) => found.has(piece));
  }

  makeMove(from: string, to: string, promotion?: string): string | null {
    try {
      const result = this.chess.move({
        from: from as Square,
        to: to as Square,
        promotion,
      });
      return result.san;
    } catch {
      return null;
    }
  }

  moveToSan(from: string, to: string, promotion?: string): string | null {
    const match = this.chess.moves({ verbose: true }).find(
      (m) =>
        m.from === from &&
        m.to === to &&
        (!promotion || m.promotion === promotion),
    );
    return match?.san ?? null;
  }

  clone(): ChessGame {
    return new ChessGame(this.fen);
  }
}
