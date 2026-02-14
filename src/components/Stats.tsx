import { useId, useMemo, useState, type ReactNode, type RefObject } from "react";
import type { RetryQueueItem, TypeStats } from "@/lib/stats-manager";

type StatsTab = "retry" | "progress";

export interface StatsContentProps {
  onOpenPuzzle: (puzzleId: number) => void;
  solved: number;
  retryQueue: RetryQueueItem[];
  currentStreak: number;
  bestStreak: number;
  successRate: number;
  currentPuzzle: number;
  totalPuzzles: number;
  typeStats: TypeStats[];
}

interface StatsContentViewProps extends StatsContentProps {
  bodyRef?: RefObject<HTMLElement | null>;
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface TabButtonProps {
  active: boolean;
  controls: string;
  id: string;
  onClick: () => void;
  children: string;
  badge?: number;
}

interface RetryCardProps {
  puzzle: RetryQueueItem;
  onSelect: (puzzleId: number) => void;
}

interface SpeedTypeCardProps {
  item: TypeStats;
}

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function getMateBadgeClass(mateIn: number): string {
  if (mateIn === 2) return "ui-stats-mate-badge ui-stats-mate-badge-2";
  if (mateIn === 3) return "ui-stats-mate-badge ui-stats-mate-badge-3";
  return "ui-stats-mate-badge ui-stats-mate-badge-1";
}

function formatRelativeTime(lastAttemptAt: number, nowMs = Date.now()): string {
  const elapsedMs = Math.max(nowMs - lastAttemptAt, 0);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (elapsedMs < hourMs) {
    const minutes = Math.max(1, Math.floor(elapsedMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < dayMs) {
    const hours = Math.max(1, Math.floor(elapsedMs / hourMs));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < weekMs) {
    const days = Math.max(1, Math.floor(elapsedMs / dayMs));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = Math.max(1, Math.floor(elapsedMs / weekMs));
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

function formatMissLabel(misses: number): string {
  return `${misses} miss${misses === 1 ? "" : "es"}`;
}

function mateTypeLabel(mateIn: number): string {
  return `Mate in ${mateIn}`;
}

function QuickStatCard({ label, value, highlight = false }: QuickStatCardProps) {
  return (
    <div className="ui-stats-quick-card" data-highlight={highlight || undefined}>
      <span className="ui-stats-quick-value">{value}</span>
      <span className="ui-stats-quick-label">{label}</span>
    </div>
  );
}

function TabButton({ active, controls, id, onClick, children, badge }: TabButtonProps) {
  const showBadge = typeof badge === "number" && badge > 0;
  return (
    <button
      type="button"
      className="ui-stats-tab-btn"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={active}
      data-active={active || undefined}
      onClick={onClick}
    >
      <span>{children}</span>
      {showBadge ? <span className="ui-stats-tab-badge">{badge}</span> : null}
    </button>
  );
}

function RetryCard({ puzzle, onSelect }: RetryCardProps) {
  return (
    <button
      type="button"
      className="ui-stats-retry-card"
      onClick={() => onSelect(puzzle.puzzleId)}
      aria-label={`Retry puzzle ${puzzle.puzzleId}`}
    >
      <span className="ui-stats-retry-title">Puzzle #{puzzle.puzzleId}</span>
      <span className="ui-stats-retry-meta">
        <span className={getMateBadgeClass(puzzle.mateIn)}>{mateTypeLabel(puzzle.mateIn)}</span>
        <span>{formatMissLabel(puzzle.missCount)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatRelativeTime(puzzle.lastAttemptAt)}</span>
      </span>
      <span className="ui-stats-retry-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function EmptyState({ emoji, title, subtitle }: EmptyStateProps) {
  return (
    <div className="ui-stats-empty-state">
      <span className="ui-stats-empty-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="ui-stats-empty-title">{title}</span>
      <span className="ui-stats-empty-subtitle">{subtitle}</span>
    </div>
  );
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="ui-stats-section-block">
      <header className="ui-stats-section-head">
        <h2 className="ui-stats-section-title">{title}</h2>
        {subtitle ? <p className="ui-stats-section-subtitle">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function SpeedTypeCard({ item }: SpeedTypeCardProps) {
  const hasNoData = item.solved === 0;
  const avgSeconds =
    hasNoData || item.avgTimeMs === null ? "—" : `${Math.round(item.avgTimeMs / 1000)}s`;

  let trendNode = <span className="ui-stats-speed-trend-muted">need more data</span>;
  if (hasNoData) {
    trendNode = <span className="ui-stats-speed-trend-muted">no data yet</span>;
  } else if (typeof item.trend === "number") {
    const direction = item.trend < 0 ? "↓" : "↑";
    const absTrend = Math.abs(item.trend);
    trendNode = (
      <span className="ui-stats-speed-trend" data-tone={item.trend < 0 ? "up" : "down"}>
        {direction} {absTrend}%
      </span>
    );
  }

  return (
    <div className="ui-stats-speed-card">
      <div className="ui-stats-speed-main">
        <span className={getMateBadgeClass(item.mateIn)}>{mateTypeLabel(item.mateIn)}</span>
        <span className="ui-stats-speed-count">{item.solved} solved</span>
      </div>
      <div className="ui-stats-speed-summary">
        <span className="ui-stats-speed-time">{avgSeconds}</span>
        {trendNode}
      </div>
    </div>
  );
}

function RetryQueueTab({
  queue,
  onOpenPuzzle,
}: {
  queue: RetryQueueItem[];
  onOpenPuzzle: (puzzleId: number) => void;
}) {
  if (queue.length === 0) {
    return (
      <EmptyState
        emoji="✨"
        title="All caught up!"
        subtitle="No failed puzzles to retry"
      />
    );
  }

  return (
    <div className="ui-stats-retry-list-wrap">
      <p className="ui-stats-retry-hint">Tap any puzzle to retry it.</p>
      <div className="ui-stats-retry-list">
        {queue.map((puzzle) => (
          <RetryCard key={puzzle.puzzleId} puzzle={puzzle} onSelect={onOpenPuzzle} />
        ))}
      </div>
    </div>
  );
}

function ProgressTab({
  bestStreak,
  currentPuzzle,
  successRate,
  totalPuzzles,
  typeStats,
}: {
  bestStreak: number;
  currentPuzzle: number;
  successRate: number;
  totalPuzzles: number;
  typeStats: TypeStats[];
}) {
  const total = Math.max(totalPuzzles, 1);
  const clampedCurrent = Math.min(Math.max(currentPuzzle, 1), total);
  const progressRatio = clampedCurrent / total;
  const progressPercent = (progressRatio * 100).toFixed(1);

  const strongestImprovement = useMemo(() => {
    return (
      typeStats
        .filter((type) => typeof type.trend === "number" && type.trend < 0)
        .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0))[0] ?? null
    );
  }, [typeStats]);

  return (
    <div className="ui-stats-progress-tab">
      <Section title="Overall">
        <div className="ui-stats-overall-card">
          <div className="ui-stats-overall-head">
            <span className="ui-stats-overall-position">
              Puzzle {clampedCurrent} of {total}
            </span>
            <span className="ui-stats-overall-percent">{progressPercent}%</span>
          </div>
          <div
            className="ui-stats-progress-track"
            role="progressbar"
            aria-label="Puzzle progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(progressPercent)}
          >
            <div
              className="ui-stats-progress-fill"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <p className="ui-stats-overall-meta">
            {successRate}% success rate · Best streak: {bestStreak}
          </p>
        </div>
      </Section>

      <Section title="Speed by Puzzle Type" subtitle="Are you improving?">
        <div className="ui-stats-speed-list">
          {typeStats.map((item) => (
            <SpeedTypeCard key={item.mateIn} item={item} />
          ))}
        </div>
      </Section>

      {strongestImprovement ? (
        <div className="ui-stats-improvement-callout">
          <p className="ui-stats-improvement-title">📈 You&apos;re improving</p>
          <p className="ui-stats-improvement-copy">
            You&apos;re solving {mateTypeLabel(strongestImprovement.mateIn)} puzzles{" "}
            <strong>{Math.abs(strongestImprovement.trend ?? 0)}% faster</strong> than when
            you started.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StatsContent({
  bodyRef,
  onOpenPuzzle,
  solved,
  retryQueue,
  currentStreak,
  bestStreak,
  successRate,
  currentPuzzle,
  totalPuzzles,
  typeStats,
}: StatsContentViewProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("retry");
  const tabsId = useId();
  const retryTabId = `${tabsId}-retry-tab`;
  const progressTabId = `${tabsId}-progress-tab`;
  const retryPanelId = `${tabsId}-retry-panel`;
  const progressPanelId = `${tabsId}-progress-panel`;

  const sortedRetryQueue = useMemo(
    () => [...retryQueue].sort((a, b) => b.lastAttemptAt - a.lastAttemptAt),
    [retryQueue],
  );

  const retryCount = sortedRetryQueue.length;

  return (
    <div className="ui-stats-root">
      <header className="ui-stats-head">
        <div className="ui-stats-quick-row">
          <QuickStatCard label="Solved" value={solved} />
          <QuickStatCard label="To Retry" value={retryCount} highlight={retryCount > 0} />
          <QuickStatCard label="Streak" value={`${currentStreak}🔥`} />
        </div>
      </header>

      <nav className="ui-stats-tabs" role="tablist" aria-label="Stats sections">
        <TabButton
          id={retryTabId}
          controls={retryPanelId}
          active={activeTab === "retry"}
          badge={retryCount}
          onClick={() => setActiveTab("retry")}
        >
          Retry Queue
        </TabButton>
        <TabButton
          id={progressTabId}
          controls={progressPanelId}
          active={activeTab === "progress"}
          onClick={() => setActiveTab("progress")}
        >
          Progress
        </TabButton>
      </nav>

      <main className="ui-stats-body" ref={bodyRef}>
        <section
          className="ui-stats-tab-panel"
          role="tabpanel"
          id={retryPanelId}
          aria-labelledby={retryTabId}
          hidden={activeTab !== "retry"}
        >
          <RetryQueueTab queue={sortedRetryQueue} onOpenPuzzle={onOpenPuzzle} />
        </section>

        <section
          className="ui-stats-tab-panel"
          role="tabpanel"
          id={progressPanelId}
          aria-labelledby={progressTabId}
          hidden={activeTab !== "progress"}
        >
          <ProgressTab
            bestStreak={bestStreak}
            currentPuzzle={currentPuzzle}
            successRate={successRate}
            totalPuzzles={totalPuzzles}
            typeStats={typeStats}
          />
        </section>
      </main>
    </div>
  );
}
