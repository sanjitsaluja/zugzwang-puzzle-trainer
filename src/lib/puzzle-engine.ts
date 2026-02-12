import { ChessGame } from "./chess";
import { parseMoves } from "./puzzles";
import type { BoardColor, GamePhase, ParsedMove, PuzzleData } from "@/types";

export interface MoveRecord {
  moveNumber: number;
  userMove: { san: string; correct: boolean };
  opponentMove?: { san: string };
}

const OPPONENT_DELAY_MS = 400;

export class PuzzleEngine {
  private game: ChessGame | null = null;
  private solution: ParsedMove[] = [];
  private solutionIndex = 0;
  private pendingMoveRecord: MoveRecord | null = null;
  private opponentTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly onChange: () => void;

  private _phase: GamePhase = "loading";
  private _isFailed = false;
  private _moveHistory: MoveRecord[] = [];
  private _lastMove: [string, string] | undefined = undefined;
  private _puzzleData: PuzzleData | null = null;

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
  get isInteractive(): boolean {
    if (this._phase !== "playing") return false;
    if (this._isFailed) return true;
    return this.turnColor === this.orientation;
  }

  loadPuzzle(puzzle: PuzzleData): void {
    this.clearOpponentTimeout();
    this.game = new ChessGame(puzzle.fen);
    this.solution = parseMoves(puzzle.moves);
    this.solutionIndex = 0;
    this._phase = "playing";
    this._isFailed = false;
    this._moveHistory = [];
    this._lastMove = undefined;
    this._puzzleData = puzzle;
    this.pendingMoveRecord = null;
    this.onChange();
  }

  makeMove(from: string, to: string, promotion?: string): void {
    if (this._phase !== "playing" || !this.game) return;

    const resolvedPromotion = promotion ?? this.autoPromote(from, to);
    const san = this.game.makeMove(from, to, resolvedPromotion);
    if (san === null) return;

    this._lastMove = [from, to];

    if (this._isFailed) {
      this.handleFreePlayMove(san);
      return;
    }

    const expected = this.solution[this.solutionIndex];
    const isCorrect =
      expected !== undefined &&
      expected.from === from &&
      expected.to === to &&
      (expected.promotion === undefined ||
        expected.promotion === resolvedPromotion);

    if (isCorrect) {
      this.solutionIndex++;
    } else {
      this._isFailed = true;
    }

    this.pendingMoveRecord = {
      moveNumber: this._moveHistory.length + 1,
      userMove: { san, correct: isCorrect },
    };

    if (this.game.isCheckmate) {
      this.finalizeMoveRecord();
      this._phase = "complete";
      this.onChange();
      return;
    }

    if (this._isFailed) {
      this.finalizeMoveRecord();
      this.onChange();
      return;
    }

    if (this.hasOpponentResponse()) {
      this._phase = "opponent_turn";
      this.onChange();
      this.scheduleOpponentMove();
    } else {
      this.finalizeMoveRecord();
      this.onChange();
    }
  }

  dispose(): void {
    this.clearOpponentTimeout();
  }

  private handleFreePlayMove(san: string): void {
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
        this.onChange();
        return;
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

  private sideJustMoved(): BoardColor {
    return this.game?.turnColor === "white" ? "black" : "white";
  }

  private autoPromote(from: string, to: string): string | undefined {
    if (!this.game) return undefined;
    if (this.game.moveToSan(from, to) !== null) return undefined;
    if (this.game.moveToSan(from, to, "q") !== null) return "q";
    return undefined;
  }

  private hasOpponentResponse(): boolean {
    return (
      this.solutionIndex < this.solution.length &&
      this.solutionIndex % 2 === 1
    );
  }

  private scheduleOpponentMove(): void {
    this.opponentTimeout = setTimeout(() => {
      this.playOpponentMove();
    }, OPPONENT_DELAY_MS);
  }

  private playOpponentMove(): void {
    if (!this.game || this._phase !== "opponent_turn") return;

    const move = this.solution[this.solutionIndex];
    if (!move) {
      this._phase = "playing";
      this.finalizeMoveRecord();
      this.onChange();
      return;
    }

    const san = this.game.makeMove(move.from, move.to, move.promotion);
    if (san === null) {
      this._phase = "playing";
      this.finalizeMoveRecord();
      this.onChange();
      return;
    }

    this._lastMove = [move.from, move.to];
    this.solutionIndex++;

    if (this.pendingMoveRecord) {
      this.pendingMoveRecord.opponentMove = { san };
    }
    this.finalizeMoveRecord();

    this._phase = this.game.isCheckmate ? "complete" : "playing";
    this.onChange();
  }

  private finalizeMoveRecord(): void {
    if (this.pendingMoveRecord) {
      this._moveHistory = [...this._moveHistory, this.pendingMoveRecord];
      this.pendingMoveRecord = null;
    }
  }

  private clearOpponentTimeout(): void {
    if (this.opponentTimeout !== null) {
      clearTimeout(this.opponentTimeout);
      this.opponentTimeout = null;
    }
  }
}
