import type { CSSProperties } from "react";

interface Segment {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export function SegmentedControl({
  segments,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps) {
  const activeIndex = Math.max(
    segments.findIndex((segment) => segment.value === value),
    0,
  );

  const style = {
    "--ui-segment-count": String(Math.max(segments.length, 1)),
    "--ui-active-index": String(activeIndex),
  } as CSSProperties;

  return (
    <div className="ui-segmented-control" role="tablist" aria-label={ariaLabel} style={style}>
      <span className="ui-segmented-control-indicator" aria-hidden="true" />
      {segments.map((segment) => (
        <button
          type="button"
          key={segment.value}
          className="ui-segmented-control-item"
          role="tab"
          aria-selected={segment.value === value}
          data-active={segment.value === value || undefined}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
