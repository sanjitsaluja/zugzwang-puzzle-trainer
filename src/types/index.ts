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
// Parsed move representation
// ---------------------------------------------------------------------------

export interface ParsedMove {
  from: string;
  to: string;
  promotion: string | undefined;
}

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

export interface PuzzleState {
  status: PuzzleStatus;
  timeMs: number | null;
  attempts: number;
}

export interface AppSettings {
  engineEnabled: boolean;
}

export interface AppState {
  currentPuzzleId: number;
  puzzles: Record<number, PuzzleState>;
  settings: AppSettings;
}

// ---------------------------------------------------------------------------
// Derived stats (computed, never stored)
// ---------------------------------------------------------------------------

export interface DerivedStats {
  totalAttempted: number;
  totalSolved: number;
  successRate: number;
  averageSolveTimeMs: number | null;
}
