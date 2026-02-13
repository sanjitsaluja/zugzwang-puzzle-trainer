import type { HTMLAttributes, ReactNode } from "react";

type ToastTone = "neutral" | "success" | "danger";

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: ToastTone;
  className?: string;
}

export function Toast({
  children,
  tone = "neutral",
  className,
  ...props
}: ToastProps) {
  const classes = ["ui-toast", className].filter(Boolean).join(" ");
  return (
    <div className={classes} data-tone={tone} {...props}>
      {children}
    </div>
  );
}
