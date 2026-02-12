import {
  type ParsedMove,
  type PromotionPiece,
  type PuzzleData,
  type Square,
  FILES,
  PROMOTION_PIECES,
  ProblemsFileSchema,
  RANKS,
  TOTAL_PUZZLES,
} from "@/types";

const MOVE_SEPARATOR = ";";
const SQUARE_LENGTH = 2;

const VALID_FILES = new Set<string>(FILES);
const VALID_RANKS = new Set<string>(RANKS);
const VALID_PROMOTIONS = new Set<string>(PROMOTION_PIECES);

function isValidSquare(s: string): s is Square {
  return (
    s.length === SQUARE_LENGTH &&
    VALID_FILES.has(s[0]!) &&
    VALID_RANKS.has(s[1]!)
  );
}

export function parseMove(raw: string): ParsedMove {
  const dashIndex = raw.indexOf("-");
  if (dashIndex === -1) {
    throw new Error(`Invalid move format (missing '-'): "${raw}"`);
  }

  const fromRaw = raw.slice(0, dashIndex);
  const toRaw = raw.slice(dashIndex + 1);

  if (!isValidSquare(fromRaw)) {
    throw new Error(`Invalid 'from' square: "${fromRaw}" in move "${raw}"`);
  }

  const toSquareRaw = toRaw.slice(0, SQUARE_LENGTH);
  const promotionRaw = toRaw.length > SQUARE_LENGTH ? toRaw[SQUARE_LENGTH] : undefined;

  if (!isValidSquare(toSquareRaw)) {
    throw new Error(`Invalid 'to' square: "${toSquareRaw}" in move "${raw}"`);
  }

  if (toRaw.length > SQUARE_LENGTH + 1) {
    throw new Error(`Invalid 'to' portion: "${toRaw}" in move "${raw}"`);
  }

  let promotion: PromotionPiece | undefined;
  if (promotionRaw !== undefined) {
    if (!VALID_PROMOTIONS.has(promotionRaw)) {
      throw new Error(`Invalid promotion piece: "${promotionRaw}" in move "${raw}"`);
    }
    promotion = promotionRaw as PromotionPiece;
  }

  return { from: fromRaw, to: toSquareRaw, promotion };
}

export function parseMoves(raw: string): ParsedMove[] {
  return raw.split(MOVE_SEPARATOR).map(parseMove);
}

export function mateDepthFromType(type: PuzzleData["type"]): number {
  switch (type) {
    case "Mate in One":
      return 1;
    case "Mate in Two":
      return 2;
    case "Mate in Three":
      return 3;
  }
}

let puzzlePromise: Promise<PuzzleData[]> | null = null;

async function fetchAndParsePuzzles(): Promise<PuzzleData[]> {
  const response = await fetch("/problems.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch puzzles: ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = ProblemsFileSchema.parse(json);

  if (parsed.problems.length !== TOTAL_PUZZLES) {
    throw new Error(
      `Expected ${TOTAL_PUZZLES} puzzles, got ${parsed.problems.length}`,
    );
  }

  return parsed.problems;
}

export function loadPuzzles(): Promise<PuzzleData[]> {
  if (!puzzlePromise) {
    puzzlePromise = fetchAndParsePuzzles().catch((err) => {
      puzzlePromise = null;
      throw err;
    });
  }
  return puzzlePromise;
}

export function getPuzzleById(
  puzzles: PuzzleData[],
  id: number,
): PuzzleData | undefined {
  return puzzles.find((p) => p.problemid === id);
}

export function _resetCache(): void {
  puzzlePromise = null;
}
