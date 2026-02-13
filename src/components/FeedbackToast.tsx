import type { FeedbackKind } from "@/lib/puzzle-engine";

interface FeedbackToastProps {
  kind: FeedbackKind;
  message: string;
}

export function FeedbackToast({ kind, message }: FeedbackToastProps) {
  return (
    <div className={`feedback-toast ${kind}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
