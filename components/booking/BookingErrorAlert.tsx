import { AlertCircle } from 'lucide-react';

/** A booking failure announced to assistive technology. The storefront announces its own in the buy box. */
export function BookingErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="max-w-4xl mx-auto p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center gap-3"
    >
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
