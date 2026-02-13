import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "primary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

export function Button({
  children,
  variant = "default",
  className,
  ...buttonProps
}: ButtonProps) {
  const classes = ["ui-button", className].filter(Boolean).join(" ");
  return (
    <button className={classes} data-variant={variant} {...buttonProps}>
      {children}
    </button>
  );
}
