import React from 'react';
import { Info } from 'lucide-react';

/** Explains which parts of the rules are shown in the official English text (ru, fr, ar, es). */
export function RulesNotice({ text }: { text: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 text-xs text-slate-300 leading-relaxed"
    >
      <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
