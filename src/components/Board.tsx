import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/dist/api";
import type { Key } from "@lichess-org/chessground/dist/types";
import type { BoardColor } from "@/types";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

interface BoardProps {
  fen: string;
  orientation: BoardColor;
  turnColor: BoardColor;
  dests: Map<string, string[]>;
  interactive: boolean;
  lastMove?: [string, string];
  check?: BoardColor | false;
  hintFrom?: string;
  hintTo?: string;
  onMove: (from: string, to: string) => void;
}

const ANIMATION_DURATION = 200;

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
  lastMove,
  check,
  hintFrom,
  hintTo,
  onMove,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
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
      coordinates: true,
      animation: { enabled: true, duration: ANIMATION_DURATION },
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: toKeyDests(dests),
        showDests: true,
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
      highlight: { lastMove: true, check: true },
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
    apiRef.current?.set({
      fen,
      orientation,
      turnColor,
      check: check || false,
      lastMove: lastMove as [Key, Key] | undefined,
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: toKeyDests(dests),
      },
      draggable: { enabled: interactive },
      selectable: { enabled: interactive },
      drawable: {
        autoShapes: toHintShapes(hintFrom, hintTo),
      },
    });
  }, [fen, orientation, turnColor, dests, interactive, lastMove, check, hintFrom, hintTo]);

  return <div ref={containerRef} className="ui-board-root" />;
}
