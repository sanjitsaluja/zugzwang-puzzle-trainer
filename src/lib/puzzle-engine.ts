import { ChessGame } from "./chess";
import { mateDepthFromType } from "./puzzles";
import type {
  BoardColor,
  GamePhase,
  ParsedMove,
  PromotionPiece,
  PuzzleData,
  PuzzleStrategy,
} from "@/types";
import { PROMOTION_PIECES } from "@/types";

export interface MoveRecord {
  moveNumber: number;
  userMove: { san: string; correct: boolean };
  opponentMove?: { san: string };
}

export type FeedbackKind = "correct" | "incorrect";

export interface FeedbackEvent {
  id: number;
  kind: FeedbackKind;
}

const OPPONENT_DELAY_MS = 400;
const VALID_PROMOTIONS = new Set<string>(PROMOTION_PIECES);

export class PuzzleEngine {
  private game: ChessGame | null = null;
  private strategy: PuzzleStrategy | null = null;
  private pendingMoveRecord: MoveRecord | null = null;
  private opponentTimeout: ReturnType<typeof setTimeout> | null = null;
  private puzzleGeneration = 0;
  private feedbackSequence = 0;
  private userMoveCount = 0;
  private totalMateDepth = 0;
  private readonly onChange: () => void;

  private _phase: GamePhase = "loading";
  private _isFailed = false;
  private _moveHistory: MoveRecord[] = [];
  private _lastMove: [string, string] | undefined = undefined;
  private _puzzleData: PuzzleData | null = null;
  private _feedbackEvent: FeedbackEvent | null = null;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  get phase(): GamePhase {
    return this._phase;
  }
  get fen(): string {
    return this.game?.fen ?? "";
  }
  get orientation(): BoardColor {
    return this._puzzleData?.first === "Black to Move" ? "black" : "white";
  }
  get turnColor(): BoardColor {
    return this.game?.turnColor ?? "white";
  }
  get dests(): Map<string, string[]> {
    return this.game?.getLegalDests() ?? new Map();
  }
  get lastMove(): [string, string] | undefined {
    return this._lastMove;
  }
  get isFailed(): boolean {
    return this._isFailed;
  }
  get isCheck(): boolean {
    return this.game?.isCheck ?? false;
  }
  get moveHistory(): MoveRecord[] {
    return this._moveHistory;
  }
  get puzzleData(): PuzzleData | null {
    return this._puzzleData;
  }
  get feedbackEvent(): FeedbackEvent | null {
    return this._feedbackEvent;
  }
  get isInteractive(): boolean {
    if (this._phase !== "playing") return false;
    if (this._isFailed && this.strategy?.freePlayBothSides) return true;
    return this.turnColor === this.orientation;
  }

  loadPuzzle(puzzle: PuzzleData, strategy: PuzzleStrategy): void {
    this.clearOpponentTimeout();
    this.puzzleGeneration++;
    this.game = new ChessGame(puzzle.fen);
    this.strategy = strategy;
    this.userMoveCount = 0;
    this.totalMateDepth = mateDepthFromType(puzzle.type);
    this._phase = "playing";
    this._isFailed = false;
    this._moveHistory = [];
    this._lastMove = undefined;
    this._puzzleData = puzzle;
    this._feedbackEvent = null;
    this.pendingMoveRecord = null;
    this.onChange();
  }

  async makeMove(from: string, to: string, promotion?: string): Promise<void> {
    if (this._phase !== "playing" || !this.game || !this.strategy) {
      console.log(`[PE] makeMove blocked: phase=${this._phase} game=${!!this.game} strategy=${!!this.strategy}`);
      return;
    }

    const gen = this.puzzleGeneration;
    const resolvedPromotion = promotion ?? this.autoPromote(from, to);
    const san = this.game.makeMove(from, to, resolvedPromotion);
    if (san === null) return;

    console.log(`[PE] makeMove: ${san} (${from}-${to}) isFailed=${this._isFailed} freePlayBothSides=${this.strategy.freePlayBothSides}`);
    this._lastMove = [from, to];

    if (this._isFailed) {
      console.log("[PE] → handleFreePlayMove");
      await this.handleFreePlayMove(san, gen);
      return;
    }

    this.userMoveCount++;

    if (this.game.isCheckmate) {
      console.log("[PE] → checkmate! complete");
      this.pendingMoveRecord = {
        moveNumber: this._moveHistory.length + 1,
        userMove: { san, correct: true },
      };
      if (!this._isFailed) {
        this.emitFeedback("correct");
      }
      this.finalizeMoveRecord();
      this._phase = "complete";
      this.onChange();
      return;
    }

    this._phase = "validating";
    this.onChange();

    const userMove = this.toParsedMove(from, to, resolvedPromotion);
    const remainingMateDepth = this.totalMateDepth - this.userMoveCount;
    console.log(`[PE] → validating (totalMateDepth=${this.totalMateDepth} remaining=${remainingMateDepth})`);
    const result = await this.strategy.validateMove(
      this.game.fen,
      userMove,
      remainingMateDepth,
    );
    if (gen !== this.puzzleGeneration) {
      console.log("[PE] → stale generation, discarding");
      return;
    }

    console.log(`[PE] → validation result: isCorrect=${result.isCorrect} opponentMove=${result.opponentMove ? `${result.opponentMove.from}-${result.opponentMove.to}` : "null"}`);

    this.pendingMoveRecord = {
      moveNumber: this._moveHistory.length + 1,
      userMove: { san, correct: result.isCorrect },
    };

    if (!result.isCorrect) {
      this._isFailed = true;
      this.emitFeedback("incorrect");
    } else {
      this.emitFeedback("correct");
    }

    if (result.opponentMove) {
      console.log("[PE] → opponent_turn, playing response");
      this._phase = "opponent_turn";
      this.onChange();
      await this.delayAsync(OPPONENT_DELAY_MS);
      if (gen !== this.puzzleGeneration) return;
      this.applyOpponentMove(result.opponentMove);
    } else {
      console.log("[PE] → no opponent move, back to playing");
      this.finalizeMoveRecord();
      this._phase = "playing";
      this.onChange();
    }
  }

  dispose(): void {
    this.clearOpponentTimeout();
    this.puzzleGeneration++;
  }

  // ---------------------------------------------------------------------------
  // Free play (after failure)
  // ---------------------------------------------------------------------------

  private async handleFreePlayMove(san: string, gen: number): Promise<void> {
    if (!this.game || !this.strategy) return;

    if (this.strategy.freePlayBothSides) {
      console.log("[PE] freePlayBothSides: user plays both sides");
      this.handleFreePlayBothSides(san);
      return;
    }

    console.log("[PE] freePlay (engine mode): asking engine for opponent move");
    this.pendingMoveRecord = {
      moveNumber: this._moveHistory.length + 1,
      userMove: { san, correct: false },
    };

    if (this.game.isCheckmate) {
      console.log("[PE] freePlay: checkmate!");
      this.finalizeMoveRecord();
      this._phase = "complete";
      this.onChange();
      return;
    }

    this._phase = "opponent_turn";
    this.onChange();

    const opponentMove = await this.strategy.getOpponentMove(this.game.fen);
    if (gen !== this.puzzleGeneration) return;

    console.log(`[PE] freePlay opponent: ${opponentMove ? `${opponentMove.from}-${opponentMove.to}` : "null"}`);
    if (opponentMove) {
      await this.delayAsync(OPPONENT_DELAY_MS);
      if (gen !== this.puzzleGeneration) return;
      this.applyOpponentMove(opponentMove);
    } else {
      this.finalizeMoveRecord();
      this._phase = "playing";
      this.onChange();
    }
  }

  private handleFreePlayBothSides(san: string): void {
    if (!this.game) return;

    const isUserSide = this.sideJustMoved() === this.orientation;

    if (isUserSide) {
      this.pendingMoveRecord = {
        moveNumber: this._moveHistory.length + 1,
        userMove: { san, correct: false },
      };

      if (this.game.isCheckmate) {
        this.finalizeMoveRecord();
        this._phase = "complete";
      }
      this.onChange();
    } else {
      if (this.pendingMoveRecord) {
        this.pendingMoveRecord.opponentMove = { san };
        this.finalizeMoveRecord();
      }

      if (this.game.isCheckmate) {
        this._phase = "complete";
      }
      this.onChange();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private applyOpponentMove(move: ParsedMove): void {
    if (!this.game) return;

    const opSan = this.game.makeMove(move.from, move.to, move.promotion);
    if (opSan && this.pendingMoveRecord) {
      this._lastMove = [move.from, move.to];
      this.pendingMoveRecord.opponentMove = { san: opSan };
    }

    this.finalizeMoveRecord();
    this._phase = this.game.isCheckmate ? "complete" : "playing";
    this.onChange();
  }

  private toParsedMove(from: string, to: string, promotion: string | undefined): ParsedMove {
    const promo: PromotionPiece | undefined =
      promotion !== undefined && VALID_PROMOTIONS.has(promotion)
        ? (promotion as PromotionPiece)
        : undefined;
    return {
      from: from as ParsedMove["from"],
      to: to as ParsedMove["to"],
      promotion: promo,
    };
  }

  private sideJustMoved(): BoardColor {
    return this.game?.turnColor === "white" ? "black" : "white";
  }

  private autoPromote(from: string, to: string): string | undefined {
    if (!this.game) return undefined;
    if (this.game.moveToSan(from, to) !== null) return undefined;
    if (this.game.moveToSan(from, to, "q") !== null) return "q";
    return undefined;
  }

  private finalizeMoveRecord(): void {
    if (this.pendingMoveRecord) {
      this._moveHistory = [...this._moveHistory, this.pendingMoveRecord];
      this.pendingMoveRecord = null;
    }
  }

  private delayAsync(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.opponentTimeout = setTimeout(resolve, ms);
    });
  }

  private clearOpponentTimeout(): void {
    if (this.opponentTimeout !== null) {
      clearTimeout(this.opponentTimeout);
      this.opponentTimeout = null;
    }
  }

  private emitFeedback(kind: FeedbackKind): void {
    this.feedbackSequence += 1;
    this._feedbackEvent = {
      id: this.feedbackSequence,
      kind,
    };
  }
}
