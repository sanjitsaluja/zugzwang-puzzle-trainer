import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PuzzleTimer } from "@/lib/timer";
import type { DerivedStats, PuzzleState } from "@/types";

interface StatsProps {
  open: boolean;
  onClose: () => void;
  onOpenPuzzle: (puzzleId: number) => void;
  onResetStats: () => void;
  stats: DerivedStats;
  puzzles: Record<number, PuzzleState>;
  currentPuzzleId: number;
  totalPuzzles: number;
}

interface MostMissedRow {
  puzzleId: number;
  misses: number;
  solved: number;
  attempts: number;
}

const columnHelper = createColumnHelper<MostMissedRow>();

const mostMissedColumns = [
  columnHelper.accessor("puzzleId", {
    header: "Puzzle",
    cell: (info) => `#${info.getValue()}`,
  }),
  columnHelper.accessor("misses", {
    header: "Misses",
  }),
  columnHelper.accessor("solved", {
    header: "Solved",
  }),
  columnHelper.accessor("attempts", {
    header: "Attempts",
  }),
];

export function Stats({
  open,
  onClose,
  onOpenPuzzle,
  onResetStats,
  stats,
  puzzles,
  currentPuzzleId,
  totalPuzzles,
}: StatsProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const puzzleStates = useMemo(() => Object.values(puzzles), [puzzles]);
  const failedCount = stats.totalAttempted - stats.totalSolved;
  const remainingCount = Math.max(totalPuzzles - stats.totalAttempted, 0);
  const progressRatio =
    totalPuzzles > 0 ? Math.min(stats.totalAttempted / totalPuzzles, 1) : 0;
  const progressPercent = (progressRatio * 100).toFixed(1);
  const successPercent = (stats.successRate * 100).toFixed(1);
  const totalAttempts = puzzleStates.reduce((sum, puzzle) => sum + puzzle.attempts, 0);
  const extraRetries = Math.max(totalAttempts - stats.totalAttempted, 0);
  const averageSolveTime =
    stats.averageSolveTimeMs === null ? "--:--" : PuzzleTimer.formatTime(stats.averageSolveTimeMs);

  const mostMissedData = useMemo<MostMissedRow[]>(() => {
    return Object.entries(puzzles)
      .map(([id, puzzle]) => ({
        puzzleId: Number(id),
        misses: puzzle.failCount,
        solved: puzzle.successCount,
        attempts: puzzle.attempts,
      }))
      .filter((row) => row.misses > 0)
      .sort((a, b) => {
        if (b.misses !== a.misses) return b.misses - a.misses;
        if (b.attempts !== a.attempts) return b.attempts - a.attempts;
        return a.puzzleId - b.puzzleId;
      })
      .slice(0, 10);
  }, [puzzles]);

  const table = useReactTable({
    data: mostMissedData,
    columns: mostMissedColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleReset = () => {
    onResetStats();
    setConfirmingReset(false);
  };

  if (!open) return null;

  return (
    <div className="stats-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="stats-modal" role="dialog" aria-modal="true" aria-label="Statistics">
        <header className="stats-header">
          <h2>Statistics</h2>
          <button className="btn stats-close" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="stats-section">
          <h3>Progress</h3>
          <div className="stats-grid">
            <div className="stats-card">
              <span className="stats-label">Current puzzle</span>
              <span className="stats-value">
                Puzzle {currentPuzzleId} / {totalPuzzles}
              </span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Remaining</span>
              <span className="stats-value">{remainingCount}</span>
            </div>
          </div>
          <div className="stats-progress">
            <div className="stats-progress-track">
              <div
                className="stats-progress-fill"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
            <span className="stats-progress-text">{progressPercent}% complete</span>
          </div>
        </section>

        <section className="stats-section">
          <h3>Performance Summary</h3>
          <div className="stats-grid">
            <div className="stats-card">
              <span className="stats-label">Attempted</span>
              <span className="stats-value">{stats.totalAttempted}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Solved</span>
              <span className="stats-value">{stats.totalSolved}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Failed</span>
              <span className="stats-value">{failedCount}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Success rate</span>
              <span className="stats-value">{successPercent}%</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Average solve time</span>
              <span className="stats-value">{averageSolveTime}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Total attempts</span>
              <span className="stats-value">{totalAttempts}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Extra retries</span>
              <span className="stats-value">{extraRetries}</span>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <h3>Most Missed Puzzles</h3>
          {mostMissedData.length === 0 ? (
            <p className="stats-empty">No missed puzzles yet. Keep training.</p>
          ) : (
            <table className="stats-table">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {cell.column.id === "puzzleId" ? (
                          <button
                            className="stats-link"
                            onClick={() => {
                              onOpenPuzzle(row.original.puzzleId);
                              onClose();
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </button>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="stats-footer">
          {!confirmingReset ? (
            <button className="btn stats-reset" onClick={() => setConfirmingReset(true)}>
              Reset Stats
            </button>
          ) : (
            <div className="stats-confirm">
              <span>Clear all puzzle stats? Current puzzle position will be kept.</span>
              <div className="stats-confirm-actions">
                <button className="btn" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </button>
                <button className="btn stats-reset-confirm" onClick={handleReset}>
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}
