import { z } from "zod";

// ---------------------------------------------------------------------------
// Puzzle data (sourced from problems.json)
// ---------------------------------------------------------------------------

export const SIDE_TO_MOVE = ["White to Move", "Black to Move"] as const;
export type SideToMove = (typeof SIDE_TO_MOVE)[number];

export const PUZZLE_TYPE = [
  "Mate in One",
  "Mate in Two",
  "Mate in Three",
] as const;
export type PuzzleType = (typeof PUZZLE_TYPE)[number];

export const PuzzleDataSchema = z.object({
  problemid: z.number().int().positive(),
  first: z.enum(SIDE_TO_MOVE),
  type: z.enum(PUZZLE_TYPE),
  fen: z.string().min(10),
  moves: z.string().min(3),
});
export type PuzzleData = z.infer<typeof PuzzleDataSchema>;

export const ProblemsFileSchema = z.object({
  problems: z.array(PuzzleDataSchema),
});
export type ProblemsFile = z.infer<typeof ProblemsFileSchema>;

export const TOTAL_PUZZLES = 4462;

// ---------------------------------------------------------------------------
// Squares & moves
// ---------------------------------------------------------------------------

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export type File = (typeof FILES)[number];

export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export type Rank = (typeof RANKS)[number];

export type Square = `${File}${Rank}`;

export const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;
export type PromotionPiece = (typeof PROMOTION_PIECES)[number];

export interface ParsedMove {
  from: Square;
  to: Square;
  promotion: PromotionPiece | undefined;
}

// ---------------------------------------------------------------------------
// Board / color
// ---------------------------------------------------------------------------

export const BOARD_COLORS = ["white", "black"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export const GAME_PHASE = [
  "loading",
  "playing",
  "validating",
  "opponent_turn",
  "complete",
] as const;
export type GamePhase = (typeof GAME_PHASE)[number];

// ---------------------------------------------------------------------------
// Persistence (localStorage)
// ---------------------------------------------------------------------------

export const PUZZLE_STATUS = ["unattempted", "success", "fail"] as const;
export type PuzzleStatus = (typeof PUZZLE_STATUS)[number];

export const PuzzleStateSchema = z.object({
  status: z.enum(PUZZLE_STATUS),
  timeMs: z.number().nullable(),
  attempts: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative().default(0),
  failCount: z.number().int().nonnegative().default(0),
  hintCount: z.number().int().nonnegative().default(0),
});
export type PuzzleState = z.infer<typeof PuzzleStateSchema>;

export const PIECE_SETS = ["cburnett", "merida", "alpha", "staunty"] as const;
export type PieceSet = (typeof PIECE_SETS)[number];

export const BOARD_THEMES = ["brown", "blue", "green", "gray"] as const;
export type BoardTheme = (typeof BOARD_THEMES)[number];

export const OVERALL_THEMES = ["auto", "light", "dark"] as const;
export type OverallTheme = (typeof OVERALL_THEMES)[number];

export const ANIMATION_SPEED_MIN_MS = 0;
export const ANIMATION_SPEED_MAX_MS = 500;
export const ANIMATION_SPEED_STEP_MS = 50;
export type AnimationSpeedMs = number;

export const AppSettingsSchema = z.object({
  overallTheme: z.enum(OVERALL_THEMES),
  pieceSet: z.enum(PIECE_SETS),
  boardTheme: z.enum(BOARD_THEMES),
  coordinates: z.boolean(),
  showLegalMoves: z.boolean(),
  highlightLastMove: z.boolean(),
  animationSpeed: z
    .number()
    .int()
    .min(ANIMATION_SPEED_MIN_MS)
    .max(ANIMATION_SPEED_MAX_MS)
    .refine((value) => value % ANIMATION_SPEED_STEP_MS === 0),
  timer: z.boolean(),
  soundEffects: z.boolean(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const AppStateSchema = z.object({
  currentPuzzleId: z.number().int().positive(),
  puzzles: z.record(z.coerce.number(), PuzzleStateSchema),
  settings: AppSettingsSchema,
});
export type AppState = z.infer<typeof AppStateSchema>;

// ---------------------------------------------------------------------------
// Puzzle validation strategy
// ---------------------------------------------------------------------------

export interface MoveValidationResult {
  isCorrect: boolean;
  opponentMove: ParsedMove | null;
}

export type ValidateMoveFn = (
  fen: string,
  userMove: ParsedMove,
  remainingMateDepth: number,
) => Promise<MoveValidationResult>;

export type GetOpponentMoveFn = (fen: string) => Promise<ParsedMove | null>;

export interface PuzzleStrategy {
  validateMove: ValidateMoveFn;
  getOpponentMove: GetOpponentMoveFn;
  freePlayBothSides: boolean;
}

// ---------------------------------------------------------------------------
// Derived stats (computed, never stored)
// ---------------------------------------------------------------------------

export interface DerivedStats {
  totalAttempted: number;
  totalSolved: number;
  successRate: number;
  averageSolveTimeMs: number | null;
  totalHintsUsed: number;
}
