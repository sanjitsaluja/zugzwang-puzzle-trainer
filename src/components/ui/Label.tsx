import type { ReactNode } from "react";

interface LabelProps {
  children: ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  const classes = ["ui-label", className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
