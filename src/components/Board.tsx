import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/dist/api";
import type { Key } from "@lichess-org/chessground/dist/types";
import {
  BOARD_THEMES,
  PIECE_SETS,
  type AnimationSpeedMs,
  type BoardColor,
  type BoardTheme,
  type PieceSet,
} from "@/types";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";
import "@/styles/chessground-piece-sets.css";

interface BoardProps {
  fen: string;
  orientation: BoardColor;
  turnColor: BoardColor;
  dests: Map<string, string[]>;
  interactive: boolean;
  pieceSet: PieceSet;
  boardTheme: BoardTheme;
  coordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  animationSpeed: AnimationSpeedMs;
  lastMove?: [string, string];
  check?: BoardColor | false;
  hintFrom?: string;
  hintTo?: string;
  onMove: (from: string, to: string) => void;
}

function toKeyDests(dests: Map<string, string[]>): Map<Key, Key[]> {
  const keyDests = new Map<Key, Key[]>();
  for (const [from, targets] of dests) {
    keyDests.set(from as Key, targets as Key[]);
  }
  return keyDests;
}

function toHintShapes(hintFrom: string | undefined, hintTo: string | undefined) {
  if (!hintFrom) return [];
  if (hintTo) {
    return [{ orig: hintFrom as Key, dest: hintTo as Key, brush: "green" as const }];
  }
  return [{ orig: hintFrom as Key, brush: "green" as const }];
}

export function Board({
  fen,
  orientation,
  turnColor,
  dests,
  interactive,
  pieceSet,
  boardTheme,
  coordinates,
  showLegalMoves,
  highlightLastMove,
  animationSpeed,
  lastMove,
  check,
  hintFrom,
  hintTo,
  onMove,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const coordinatesRef = useRef(coordinates);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;

    const api = Chessground(containerRef.current, {
      fen,
      orientation,
      turnColor,
      check: check || false,
      lastMove: lastMove as [Key, Key] | undefined,
      coordinates,
      animation: {
        enabled: animationSpeed > 0,
        duration: animationSpeed,
      },
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: toKeyDests(dests),
        showDests: showLegalMoves,
        events: {
          after(orig, dest) {
            onMoveRef.current(orig, dest);
          },
        },
      },
      draggable: { enabled: interactive },
      selectable: { enabled: interactive },
      premovable: { enabled: false },
      predroppable: { enabled: false },
      highlight: { lastMove: highlightLastMove, check: true },
      drawable: {
        enabled: false,
        visible: true,
        autoShapes: toHintShapes(hintFrom, hintTo),
      },
    });

    apiRef.current = api;
    return () => api.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    api.set({
      fen,
      orientation,
      turnColor,
      check: check || false,
      lastMove: lastMove as [Key, Key] | undefined,
      coordinates,
      animation: {
        enabled: animationSpeed > 0,
        duration: animationSpeed,
      },
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: toKeyDests(dests),
        showDests: showLegalMoves,
      },
      draggable: { enabled: interactive },
      selectable: { enabled: interactive },
      highlight: { lastMove: highlightLastMove, check: true },
      drawable: {
        autoShapes: toHintShapes(hintFrom, hintTo),
      },
    });

    // Chessground updates coordinate labels only when wrapping DOM is rebuilt.
    if (coordinatesRef.current !== coordinates) {
      api.redrawAll();
      coordinatesRef.current = coordinates;
    }
  }, [
    fen,
    orientation,
    turnColor,
    dests,
    interactive,
    coordinates,
    showLegalMoves,
    highlightLastMove,
    animationSpeed,
    lastMove,
    check,
    hintFrom,
    hintTo,
  ]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      apiRef.current?.redrawAll();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    for (const theme of BOARD_THEMES) {
      node.classList.toggle(`ui-board-theme-${theme}`, theme === boardTheme);
    }
    for (const set of PIECE_SETS) {
      node.classList.toggle(`ui-piece-set-${set}`, set === pieceSet);
    }
  }, [boardTheme, pieceSet]);

  return (
    <div
      ref={containerRef}
      className="ui-board-root"
      data-board-theme={boardTheme}
      data-piece-set={pieceSet}
    />
  );
}
