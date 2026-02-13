import type { ReactNode } from "react";
import { Label } from "./Label";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MetricCard({ label, value, className }: MetricCardProps) {
  const classes = ["ui-metric-card", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <Label>{label}</Label>
      <span className="ui-metric-value">{value}</span>
    </div>
  );
}
