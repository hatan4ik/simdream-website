import React from 'react';

export interface LegalTocItem {
  /** Anchor id of the section the entry jumps to. */
  id: string;
  /** Section number, or empty for unnumbered sections. */
  number: string;
  title: string;
}

interface LegalTocProps {
  label: string;
  items: readonly LegalTocItem[];
}

/** Table of contents: anchor links to every section, two columns from the `sm` breakpoint. */
export function LegalToc({ label, items }: LegalTocProps) {
  return (
    <nav aria-label={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wide text-slate-300">{label}</p>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center gap-2 text-slate-300 hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-md"
            >
              {item.number ? (
                <span dir="ltr" className="w-6 shrink-0 font-mono text-sky-400">
                  {item.number}
                </span>
              ) : null}
              <span>{item.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
