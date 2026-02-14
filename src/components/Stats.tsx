import { useMemo, useState, type ReactNode } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PuzzleTimer } from "@/lib/timer";
import type { DerivedStats, PuzzleState } from "@/types";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { MetricCard } from "@/components/ui/MetricCard";
import { Panel } from "@/components/ui/Panel";

export interface StatsContentProps {
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

interface StatsSectionProps {
  title: string;
  children: ReactNode;
}

function StatsSection({ title, children }: StatsSectionProps) {
  return (
    <Panel className="ui-stats-section">
      <Label className="ui-stats-section-title">{title}</Label>
      {children}
    </Panel>
  );
}

export function StatsContent({
  onOpenPuzzle,
  onResetStats,
  stats,
  puzzles,
  currentPuzzleId,
  totalPuzzles,
}: StatsContentProps) {
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

  return (
    <>
      <StatsSection title="Progress">
        <div className="ui-stats-grid">
          <MetricCard
            label="Current puzzle"
            value={`Puzzle ${currentPuzzleId} / ${totalPuzzles}`}
          />
          <MetricCard label="Remaining" value={remainingCount} />
        </div>
        <div className="ui-stats-progress">
          <div className="ui-stats-progress-track">
            <div className="ui-stats-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
          </div>
          <span className="ui-stats-progress-text">{progressPercent}% complete</span>
        </div>
      </StatsSection>

      <StatsSection title="Performance Summary">
        <div className="ui-stats-grid">
          <MetricCard label="Attempted" value={stats.totalAttempted} />
          <MetricCard label="Solved" value={stats.totalSolved} />
          <MetricCard label="Failed" value={failedCount} />
          <MetricCard label="Success rate" value={`${successPercent}%`} />
          <MetricCard label="Average solve time" value={averageSolveTime} />
          <MetricCard label="Total attempts" value={totalAttempts} />
          <MetricCard label="Extra retries" value={extraRetries} />
        </div>
      </StatsSection>

      <StatsSection title="Most Missed Puzzles">
        {mostMissedData.length === 0 ? (
          <p className="ui-stats-empty">No missed puzzles yet. Keep training.</p>
        ) : (
          <table className="ui-stats-table">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="ui-stats-table-header-cell">
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
                    <td key={cell.id} className="ui-stats-table-cell">
                      {cell.column.id === "puzzleId" ? (
                        <button className="ui-stats-link" onClick={() => onOpenPuzzle(row.original.puzzleId)}>
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
      </StatsSection>

      <footer className="ui-stats-footer">
        {!confirmingReset ? (
          <Button className="ui-stats-reset-button" onClick={() => setConfirmingReset(true)}>
            Reset Stats
          </Button>
        ) : (
          <div className="ui-stats-confirm">
            <span className="ui-stats-confirm-message">
              Clear all puzzle stats? Current puzzle position will be kept.
            </span>
            <div className="ui-stats-confirm-actions">
              <Button onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReset}>
                Confirm Reset
              </Button>
            </div>
          </div>
        )}
      </footer>
    </>
  );
}
