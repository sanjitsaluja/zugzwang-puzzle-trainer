import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionBar } from "@/components/ActionBar";
import { Board } from "@/components/Board";
import { MenuModal } from "@/components/MenuModal";
import { MoveList } from "@/components/MoveList";
import { PromotionPicker } from "@/components/PromotionPicker";
import { PuzzleInfo } from "@/components/PuzzleInfo";
import { Timer } from "@/components/Timer";
import { useStats } from "@/hooks/useStats";
import { usePuzzle } from "@/hooks/usePuzzle";
import { loadPuzzles } from "@/lib/puzzles";
import type { FeedbackKind } from "@/lib/puzzle-engine";
import {
  createPuzzleDataProvider,
  type PuzzleDataProvider,
} from "@/lib/stats-manager";
import { TOTAL_PUZZLES, type BoardColor, type PromotionPiece } from "@/types";

type PulseVariant = "pulse-a" | "pulse-b";
type BoardVisualState = "neutral" | "success" | "failed" | "failed-active";

interface PendingPromotion {
  from: string;
  to: string;
  color: BoardColor;
  options: PromotionPiece[];
}

const APP_LOADING_CLASS = "ui-app-status ui-app-status-loading";
const APP_ERROR_CLASS = "ui-app-status ui-app-status-error";

const FALLBACK_STATS_PROVIDER: PuzzleDataProvider = {
  getMateIn(): number {
    return 1;
  },
  getTotalCount(): number {
    return TOTAL_PUZZLES;
  },
};

function parseRoutePuzzleId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function deriveCheckColor(isCheck: boolean, turnColor: BoardColor): BoardColor | false {
  return isCheck ? turnColor : false;
}

export function App() {
  const { puzzleId: puzzleIdParam } = useParams<{ puzzleId: string }>();
  const navigate = useNavigate();
  const [statsProvider, setStatsProvider] = useState<PuzzleDataProvider>(FALLBACK_STATS_PROVIDER);
  const {
    recordAttempt,
    solved,
    retryQueue,
    currentStreak,
    bestStreak,
    successRate,
    totalPuzzles,
    typeStats,
  } = useStats(statsProvider);
  const handlePuzzleComplete = useCallback(
    (event: { puzzleId: number; timeMs: number; success: boolean }) => {
      if (!event.success) return;
      recordAttempt(event.puzzleId, event.timeMs, event.success);
    },
    [recordAttempt],
  );
  const handlePuzzleFailed = useCallback(
    (event: { puzzleId: number; timeMs: number }) => {
      recordAttempt(event.puzzleId, event.timeMs, false);
    },
    [recordAttempt],
  );
  const puzzle = usePuzzle({
    onPuzzleFailed: handlePuzzleFailed,
    onPuzzleComplete: handlePuzzleComplete,
  });
  const { currentPuzzleId, goToPuzzle } = puzzle;
  const routePuzzleId = parseRoutePuzzleId(puzzleIdParam);
  const [pulseKind, setPulseKind] = useState<FeedbackKind | null>(null);
  const [pulseVariant, setPulseVariant] = useState<PulseVariant>("pulse-a");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const lastFeedbackIdRef = useRef(0);
  const menuPausedTimerRef = useRef(false);
  const pauseTimerRef = useRef(puzzle.pauseTimer);
  pauseTimerRef.current = puzzle.pauseTimer;
  const resumeTimerRef = useRef(puzzle.resumeTimer);
  resumeTimerRef.current = puzzle.resumeTimer;

  useEffect(() => {
    let isCancelled = false;
    loadPuzzles()
      .then((puzzles) => {
        if (isCancelled) return;
        setStatsProvider(createPuzzleDataProvider(puzzles));
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize stats provider:", error);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (routePuzzleId === null) {
      navigate(`/puzzle/${currentPuzzleId}`, { replace: true });
      return;
    }
    if (routePuzzleId !== currentPuzzleId) {
      goToPuzzle(routePuzzleId);
    }
  }, [currentPuzzleId, goToPuzzle, navigate, routePuzzleId]);

  useEffect(() => {
    const feedback = puzzle.feedbackEvent;
    if (!feedback || feedback.id <= lastFeedbackIdRef.current) return;
    lastFeedbackIdRef.current = feedback.id;
    setPulseKind(feedback.kind);
    setPulseVariant((current) => (current === "pulse-a" ? "pulse-b" : "pulse-a"));
  }, [puzzle.feedbackEvent]);

  useEffect(() => {
    if (!pulseKind) return;
    const timeout = window.setTimeout(() => {
      setPulseKind(null);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [pulseKind]);

  useEffect(() => {
    setPendingPromotion(null);
  }, [currentPuzzleId, puzzle.fen]);

  useEffect(() => {
    if (isMenuOpen) {
      menuPausedTimerRef.current = pauseTimerRef.current();
      return;
    }

    if (menuPausedTimerRef.current) {
      resumeTimerRef.current();
      menuPausedTimerRef.current = false;
    }
  }, [isMenuOpen]);

  if (puzzle.isLoading) {
    const message =
      puzzle.engineStatus === "loading" ? "Loading engine..." : "Loading puzzles...";
    return <div className={APP_LOADING_CLASS}>{message}</div>;
  }

  if (puzzle.loadError) {
    return <div className={APP_ERROR_CLASS}>{puzzle.loadError}</div>;
  }

  const puzzleId = puzzle.puzzleData?.problemid ?? 1;
  const puzzleType = puzzle.puzzleData?.type ?? "";
  const sideToMove = puzzle.puzzleData?.first ?? "";
  const isComplete = puzzle.phase === "complete";
  const isFirstPuzzle = puzzle.currentPuzzleId <= 1;

  const boardVisualState: BoardVisualState = isComplete
    ? puzzle.isFailed
      ? "failed"
      : "success"
    : puzzle.isFailed
      ? "failed-active"
      : "neutral";
  const boardPulseKind = !isComplete ? pulseKind : null;
  const boardPulseVariant = boardPulseKind ? pulseVariant : null;

  const boardLastMove = puzzle.lastMove;
  const hintFrom = puzzle.hintMove && puzzle.hintStep >= 1 ? puzzle.hintMove.from : undefined;
  const hintTo = puzzle.hintMove && puzzle.hintStep >= 2 ? puzzle.hintMove.to : undefined;

  const handleBoardMove = (from: string, to: string) => {
    const options = puzzle.getPromotionOptions(from, to);
    if (options.length > 0) {
      setPendingPromotion({
        from,
        to,
        color: puzzle.turnColor,
        options,
      });
      return;
    }
    puzzle.makeMove(from, to);
  };

  const handlePromotionSelect = (piece: PromotionPiece) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    puzzle.makeMove(from, to, piece);
  };

  const handleBack = () => {
    if (isFirstPuzzle) return;
    const targetPuzzleId = puzzle.currentPuzzleId - 1;
    puzzle.previousPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };
  const handleNext = () => {
    if (puzzle.isLastPuzzle) return;
    const targetPuzzleId = puzzle.currentPuzzleId + 1;
    puzzle.nextPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };
  const handleHint = () => {
    void puzzle.requestHint();
  };
  const handleReset = () => {
    puzzle.resetCurrentPuzzle();
  };
  const handleOpenMenu = () => {
    setIsMenuOpen(true);
  };
  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };
  const handleOpenPuzzleFromStats = (targetPuzzleId: number) => {
    if (menuPausedTimerRef.current) {
      resumeTimerRef.current();
      menuPausedTimerRef.current = false;
    }
    puzzle.goToPuzzle(targetPuzzleId);
    navigate(`/puzzle/${targetPuzzleId}`);
    setIsMenuOpen(false);
  };

  return (
    <div className="ui-app-shell">
      <div className="ui-app-layout">
        <div className="ui-layout-header">
          <div className="ui-header-logo" aria-label="Zugzwang">
            zugzwang
          </div>

          <PuzzleInfo
            puzzleId={puzzleId}
            puzzleType={puzzleType}
            sideToMove={sideToMove}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          <div className="ui-header-right">
            <div className="ui-header-streak" aria-label={`Current streak: ${currentStreak}`}>
              <span aria-hidden="true">🔥</span>
              <span>{currentStreak}</span>
            </div>

            {puzzle.settings.timer && (
              <Timer
                formatted={puzzle.formattedTime}
                phase={puzzle.phase}
                isFailed={puzzle.isFailed}
              />
            )}

            <button
              className="ui-header-menu-btn"
              onClick={handleOpenMenu}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 4 16" width="4" height="16" fill="currentColor" aria-hidden="true">
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="2" cy="8" r="1.5" />
                <circle cx="2" cy="14" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="ui-layout-board">
          <div
            className="ui-board-wrapper"
            data-state={boardVisualState}
            data-pulse-kind={boardPulseKind ?? undefined}
            data-pulse-variant={boardPulseVariant ?? undefined}
          >
            <Board
              fen={puzzle.fen}
              orientation={puzzle.orientation}
              turnColor={puzzle.turnColor}
              dests={puzzle.dests}
              interactive={puzzle.isInteractive}
              pieceSet={puzzle.settings.pieceSet}
              boardTheme={puzzle.settings.boardTheme}
              coordinates={puzzle.settings.coordinates}
              showLegalMoves={puzzle.settings.showLegalMoves}
              highlightLastMove={puzzle.settings.highlightLastMove}
              animationSpeed={puzzle.settings.animationSpeed}
              {...(boardLastMove ? { lastMove: boardLastMove } : {})}
              check={deriveCheckColor(puzzle.isCheck, puzzle.turnColor)}
              {...(hintFrom ? { hintFrom } : {})}
              {...(hintTo ? { hintTo } : {})}
              onMove={handleBoardMove}
            />
            {pendingPromotion && (
              <PromotionPicker
                orientation={puzzle.orientation}
                color={pendingPromotion.color}
                destination={pendingPromotion.to}
                options={pendingPromotion.options}
                onSelect={handlePromotionSelect}
              />
            )}
          </div>
        </div>

        <div className="ui-layout-moves">
          <MoveList
            moves={puzzle.moveHistory}
            showPlaceholder={puzzle.phase !== "loading" && puzzle.phase !== "complete"}
          />
        </div>

        <div className="ui-layout-source">Susan Polgar Collection</div>

        <div className="ui-layout-actions">
          <ActionBar
            isPrevDisabled={isFirstPuzzle}
            isNextDisabled={puzzle.isLastPuzzle}
            isHintDisabled={isComplete || puzzle.isHintLoading}
            isResetDisabled={puzzle.isAtInitialState}
            isHintBusy={puzzle.isHintLoading}
            onPrev={handleBack}
            onNext={handleNext}
            onHint={handleHint}
            onReset={handleReset}
          />
        </div>
      </div>
      <MenuModal
        open={isMenuOpen}
        onClose={handleCloseMenu}
        onOpenPuzzle={handleOpenPuzzleFromStats}
        solved={solved}
        retryQueue={retryQueue}
        currentStreak={currentStreak}
        bestStreak={bestStreak}
        successRate={successRate}
        currentPuzzle={puzzle.currentPuzzleId}
        totalPuzzles={totalPuzzles}
        typeStats={typeStats}
      />
    </div>
  );
}
