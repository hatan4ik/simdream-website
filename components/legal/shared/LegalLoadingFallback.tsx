import React from 'react';

/** Placeholder while a language's clause text loads; sized like a card so the page does not jump. */
export function LegalLoadingFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-64 rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400"
    >
      {label}
    </div>
  );
}
