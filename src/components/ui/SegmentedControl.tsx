interface Segment {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ segments, value, onChange }: SegmentedControlProps) {
  return (
    <div className="ui-segmented-control" role="tablist">
      {segments.map((segment) => (
        <button
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
