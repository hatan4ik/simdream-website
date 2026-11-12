'use client';

import React from 'react';
import type { ConsentCopy } from './consent-copy';

interface ConsentCategoryRowProps {
  title: string;
  description: string;
  /** `locked`: always on. `toggle`: the visitor decides. `unused`: no such storage on this site. */
  kind: 'locked' | 'toggle' | 'unused';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  copy: Pick<ConsentCopy, 'alwaysOn' | 'on' | 'off' | 'notUsed'>;
  children?: React.ReactNode;
}

/** One category in the settings dialog. A toggle only exists for a category the site really uses. */
export function ConsentCategoryRow({ title, description, kind, checked = false, onChange, copy, children }: ConsentCategoryRowProps) {
  return (
    <li className="rounded-xl border border-slate-700 bg-slate-950/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs leading-relaxed text-slate-300">{description}</p>
        </div>
        {kind === 'locked' && <span className="shrink-0 pt-0.5 text-xs font-medium text-emerald-400">{copy.alwaysOn}</span>}
        {kind === 'unused' && <span className="shrink-0 pt-0.5 text-xs text-slate-400">{copy.notUsed}</span>}
        {kind === 'toggle' && (
          <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-200">
            <span>{checked ? copy.on : copy.off}</span>
            {/* The input itself is the visible switch (a real, clickable, focusable control). */}
            <input
              type="checkbox"
              role="switch"
              checked={checked}
              onChange={(event) => onChange?.(event.target.checked)}
              aria-label={title}
              className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full border border-slate-500 bg-slate-800 transition-colors before:absolute before:start-0.5 before:top-0.5 before:h-4.5 before:w-4.5 before:rounded-full before:bg-slate-300 before:transition-transform checked:border-sky-400 checked:bg-sky-700 checked:before:translate-x-5 checked:before:bg-white rtl:checked:before:-translate-x-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            />
          </label>
        )}
      </div>
      {children}
    </li>
  );
}
