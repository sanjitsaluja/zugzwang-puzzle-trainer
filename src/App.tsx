import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionBar } from "@/components/ActionBar";
import { Board } from "@/components/Board";
import { FeedbackToast } from "@/components/FeedbackToast";
import { MoveList } from "@/components/MoveList";
import { PuzzleInfo } from "@/components/PuzzleInfo";
import { Stats } from "@/components/Stats";
import { Timer } from "@/components/Timer";
import { useAppState } from "@/hooks/useAppState";
import { usePuzzle } from "@/hooks/usePuzzle";
import { useTheme } from "@/hooks/useTheme";
import type { FeedbackKind } from "@/lib/puzzle-engine";
import { TOTAL_PUZZLES, type BoardColor } from "@/types";

type PulseVariant = "pulse-a" | "pulse-b";
type BoardVisualState = "neutral" | "success" | "failed" | "failed-active";

const APP_LOADING_CLASS = "ui-app-status ui-app-status-loading";
const APP_ERROR_CLASS = "ui-app-status ui-app-status-error";

function parseRoutePuzzleId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function deriveCheckColor(isCheck: boolean, turnColor: BoardColor): BoardColor | false {
  return isCheck ? turnColor : false;
}

function feedbackMessage(kind: FeedbackKind): string {
  if (kind === "correct") return "Correct!";
  return "Not the best move. Keep playing to explore.";
}

export function App() {
  const { puzzleId: puzzleIdParam } = useParams<{ puzzleId: string }>();
  const navigate = useNavigate();
  const { state, stats, resetPuzzleStats } = useAppState();
  const puzzle = usePuzzle();
  const theme = useTheme();
  const routePuzzleId = parseRoutePuzzleId(puzzleIdParam);
  const [pulseKind, setPulseKind] = useState<FeedbackKind | null>(null);
  const [pulseVariant, setPulseVariant] = useState<PulseVariant>("pulse-a");
  const [toastKind, setToastKind] = useState<FeedbackKind | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const lastFeedbackIdRef = useRef(0);

  useEffect(() => {
    if (routePuzzleId === null) {
      navigate(`/puzzle/${puzzle.currentPuzzleId}`, { replace: true });
      return;
    }
    if (routePuzzleId !== puzzle.currentPuzzleId) {
      puzzle.goToPuzzle(routePuzzleId);
    }
  }, [navigate, puzzle.currentPuzzleId, puzzle.goToPuzzle, routePuzzleId]);

  useEffect(() => {
    const feedback = puzzle.feedbackEvent;
    if (!feedback || feedback.id <= lastFeedbackIdRef.current) return;
    lastFeedbackIdRef.current = feedback.id;
    setPulseKind(feedback.kind);
    setPulseVariant((current) => (current === "pulse-a" ? "pulse-b" : "pulse-a"));
    setToastKind(feedback.kind);
    setToastMessage(feedbackMessage(feedback.kind));
  }, [puzzle.feedbackEvent]);

  useEffect(() => {
    if (!pulseKind) return;
    const timeout = window.setTimeout(() => {
      setPulseKind(null);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [pulseKind]);

  useEffect(() => {
    if (!toastKind) return;
    const timeout = window.setTimeout(() => {
      setToastKind(null);
      setToastMessage("");
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [toastKind]);

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
  const canAdvance = isComplete && !puzzle.isLastPuzzle;

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
  const handleBack = () => {
    if (isFirstPuzzle) return;
    const targetPuzzleId = puzzle.currentPuzzleId - 1;
    puzzle.previousPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };
  const handleNext = () => {
    if (!canAdvance) return;
    const targetPuzzleId = puzzle.currentPuzzleId + 1;
    puzzle.nextPuzzle();
    navigate(`/puzzle/${targetPuzzleId}`);
  };
  const handleOpenStats = () => {
    setIsStatsOpen(true);
  };
  const handleCloseStats = () => {
    setIsStatsOpen(false);
  };
  const handleOpenPuzzleFromStats = (targetPuzzleId: number) => {
    puzzle.goToPuzzle(targetPuzzleId);
    navigate(`/puzzle/${targetPuzzleId}`);
  };

  const settingsLabel =
    theme.preference === "system"
      ? `Theme: Auto (${theme.resolvedTheme})`
      : `Theme: ${theme.preference === "dark" ? "Dark" : "Light"}`;

  return (
    <div className="ui-app-shell">
      <div className="ui-app-layout">
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
            {...(boardLastMove ? { lastMove: boardLastMove } : {})}
            check={deriveCheckColor(puzzle.isCheck, puzzle.turnColor)}
            onMove={puzzle.makeMove}
          />
        </div>

        <div className="ui-app-sidebar">
          <PuzzleInfo
            puzzleId={puzzleId}
            puzzleType={puzzleType}
            sideToMove={sideToMove}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          <Timer
            formatted={puzzle.formattedTime}
            phase={puzzle.phase}
            isFailed={puzzle.isFailed}
          />

          {toastKind && <FeedbackToast kind={toastKind} message={toastMessage} />}

          <MoveList
            moves={puzzle.moveHistory}
            showPlaceholder={puzzle.phase === "playing" && !puzzle.isFailed}
          />

          <ActionBar
            isBackDisabled={isFirstPuzzle}
            isNextDisabled={!canAdvance}
            isNextActive={canAdvance}
            isComplete={isComplete}
            isLastPuzzle={puzzle.isLastPuzzle}
            onBack={handleBack}
            settingsLabel={settingsLabel}
            onOpenSettings={theme.cyclePreference}
            onOpenStats={handleOpenStats}
            onNext={handleNext}
          />
        </div>
      </div>
      <Stats
        open={isStatsOpen}
        onClose={handleCloseStats}
        onOpenPuzzle={handleOpenPuzzleFromStats}
        onResetStats={resetPuzzleStats}
        stats={stats}
        puzzles={state.puzzles}
        currentPuzzleId={state.currentPuzzleId}
        totalPuzzles={TOTAL_PUZZLES}
      />
    </div>
  );
}
