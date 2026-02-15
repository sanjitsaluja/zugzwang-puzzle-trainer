import type { BoardTheme, PieceSet } from "@/types";

type StyleLoader = () => Promise<unknown>;

const boardThemeLoaders: Record<BoardTheme, StyleLoader> = {
  brown: () => import("@/styles/chessground-board-theme-brown.css"),
  blue: () => import("@/styles/chessground-board-theme-blue.css"),
  green: () => import("@/styles/chessground-board-theme-green.css"),
  gray: () => import("@/styles/chessground-board-theme-gray.css"),
};

const pieceSetLoaders: Record<PieceSet, StyleLoader> = {
  cburnett: () => import("@lichess-org/chessground/assets/chessground.cburnett.css"),
  merida: () => import("@/styles/chessground-piece-set-merida.css"),
  alpha: () => import("@/styles/chessground-piece-set-alpha.css"),
  staunty: () => import("@/styles/chessground-piece-set-staunty.css"),
};

const loadedBoardThemes = new Set<BoardTheme>();
const loadedPieceSets = new Set<PieceSet>();
const loadingBoardThemes = new Map<BoardTheme, Promise<void>>();
const loadingPieceSets = new Map<PieceSet, Promise<void>>();

function loadStyleOnce<Key extends string>(
  key: Key,
  loader: StyleLoader,
  loaded: Set<Key>,
  loading: Map<Key, Promise<void>>,
): Promise<void> {
  if (loaded.has(key)) return Promise.resolve();

  const currentLoad = loading.get(key);
  if (currentLoad) return currentLoad;

  const pendingLoad = loader()
    .then(() => {
      loaded.add(key);
    })
    .finally(() => {
      loading.delete(key);
    });

  loading.set(key, pendingLoad);
  return pendingLoad;
}

export function ensureBoardThemeStyles(theme: BoardTheme): Promise<void> {
  return loadStyleOnce(
    theme,
    boardThemeLoaders[theme],
    loadedBoardThemes,
    loadingBoardThemes,
  );
}

export function ensurePieceSetStyles(pieceSet: PieceSet): Promise<void> {
  return loadStyleOnce(
    pieceSet,
    pieceSetLoaders[pieceSet],
    loadedPieceSets,
    loadingPieceSets,
  );
}
