import {
  type ParsedMove,
  type PuzzleData,
  ProblemsFileSchema,
  TOTAL_PUZZLES,
} from "@/types";

const MOVE_SEPARATOR = ";";
const SQUARE_LENGTH = 2;

export function parseMove(raw: string): ParsedMove {
  const dashIndex = raw.indexOf("-");
  if (dashIndex === -1) {
    throw new Error(`Invalid move format (missing '-'): "${raw}"`);
  }

  const from = raw.slice(0, dashIndex);
  const toRaw = raw.slice(dashIndex + 1);

  if (from.length !== SQUARE_LENGTH) {
    throw new Error(`Invalid 'from' square: "${from}" in move "${raw}"`);
  }

  if (toRaw.length < SQUARE_LENGTH || toRaw.length > SQUARE_LENGTH + 1) {
    throw new Error(`Invalid 'to' portion: "${toRaw}" in move "${raw}"`);
  }

  const to = toRaw.slice(0, SQUARE_LENGTH);
  const promotion =
    toRaw.length > SQUARE_LENGTH ? toRaw[SQUARE_LENGTH] : undefined;

  return { from, to, promotion };
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

let cachedPuzzles: PuzzleData[] | null = null;

export async function loadPuzzles(): Promise<PuzzleData[]> {
  if (cachedPuzzles) return cachedPuzzles;

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

  cachedPuzzles = parsed.problems;
  return cachedPuzzles;
}

export function getPuzzleById(
  puzzles: PuzzleData[],
  id: number,
): PuzzleData | undefined {
  return puzzles.find((p) => p.problemid === id);
}

/** Only for testing — resets the in-memory cache */
export function _resetCache(): void {
  cachedPuzzles = null;
}
