import { createElement } from "react";
import type { BoardColor, PieceSet, PromotionPiece } from "@/types";
import { FILES } from "@/types";

interface PromotionPickerProps {
  orientation: BoardColor;
  color: BoardColor;
  pieceSet: PieceSet;
  destination: string;
  options: PromotionPiece[];
  onSelect: (piece: PromotionPiece) => void;
}

interface DisplayCoords {
  col: number;
  row: number;
}

const ORDERED_OPTIONS: PromotionPiece[] = ["q", "n", "r", "b"];
const OPTION_LABELS: Record<PromotionPiece, string> = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
};
const PIECE_ROLES: Record<PromotionPiece, string> = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
};
const SQUARE_PERCENT = 12.5;

function squareToDisplayCoords(square: string, orientation: BoardColor): DisplayCoords | null {
  if (square.length !== 2) return null;
  const file = square[0];
  const rank = Number(square[1]);
  if (!Number.isInteger(rank) || rank < 1 || rank > 8) return null;

  const fileIndex = FILES.indexOf(file as (typeof FILES)[number]);
  if (fileIndex < 0) return null;

  if (orientation === "white") {
    return { col: fileIndex, row: 8 - rank };
  }
  return { col: 7 - fileIndex, row: rank - 1 };
}

function buildOptionSquares(
  destination: string,
  color: BoardColor,
  count: number,
): string[] {
  if (destination.length !== 2 || count <= 0) return [];
  const file = destination[0];
  const rank = Number(destination[1]);
  if (!Number.isInteger(rank) || rank < 1 || rank > 8) return [];

  const step = color === "white" ? -1 : 1;
  const squares: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const nextRank = rank + step * i;
    if (nextRank < 1 || nextRank > 8) break;
    squares.push(`${file}${nextRank}`);
  }
  return squares;
}

export function PromotionPicker({
  orientation,
  color,
  pieceSet,
  destination,
  options,
  onSelect,
}: PromotionPickerProps) {
  const ordered = ORDERED_OPTIONS.filter((piece) => options.includes(piece));
  const squares = buildOptionSquares(destination, color, ordered.length);

  const placements = ordered
    .map((piece, index) => {
      const square = squares[index];
      if (!square) return null;
      const coords = squareToDisplayCoords(square, orientation);
      if (!coords) return null;
      return { piece, coords, index };
    })
    .filter((placement): placement is { piece: PromotionPiece; coords: DisplayCoords; index: number } => {
      return placement !== null;
    });

  if (placements.length === 0) return null;

  return (
    <div
      className={`ui-promotion-overlay cg-wrap ui-piece-set-${pieceSet}`}
      role="dialog"
      aria-label="Choose promotion piece"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 12,
      }}
    >
      {placements.map(({ piece, coords, index }) => (
        <button
          key={piece}
          type="button"
          className="ui-promotion-option"
          data-primary={index === 0 ? "true" : undefined}
          style={{
            left: `${coords.col * SQUARE_PERCENT}%`,
            top: `${coords.row * SQUARE_PERCENT}%`,
          }}
          onClick={() => onSelect(piece)}
          aria-label={`Promote to ${OPTION_LABELS[piece]}`}
        >
          {createElement("piece", {
            className: `${color} ${PIECE_ROLES[piece]} ui-promotion-piece`,
            "aria-hidden": true,
            style: {
              left: "11%",
              top: "11%",
              width: "78%",
              height: "78%",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            },
          })}
        </button>
      ))}
    </div>
  );
}
