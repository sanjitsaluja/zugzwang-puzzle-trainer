import type { FeedbackKind } from "@/lib/puzzle-engine";
import { Toast } from "@/components/ui/Toast";

interface FeedbackToastProps {
  kind: FeedbackKind;
  message: string;
}

export function FeedbackToast({ kind, message }: FeedbackToastProps) {
  const tone = kind === "correct" ? "success" : "danger";

  return (
    <Toast tone={tone} role="status" aria-live="polite">
      {message}
    </Toast>
  );
}
